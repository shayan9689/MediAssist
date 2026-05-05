import { create } from 'zustand'
import { DEFAULT_CHAT_MODE } from '@/features/chat/constants/modes'
import { DEFAULT_TOPIC } from '@/features/chat/constants/topics'
import {
  MCQ_MESSAGE_PREFIX,
  extractUploadText,
  requestDrillMcq,
  requestSessionTitle,
  requestUploadStudyPack,
  UPLOAD_PACK_PREFIX,
  streamAssistantReply,
  type UploadPackIntent,
} from '@/features/chat/services/chat-api'
import { createChatPersistence } from '@/features/chat/services/create-chat-persistence'
import type { ChatPersistence } from '@/features/chat/services/chat-persistence'
import type { ChatMessage, ChatMode, ChatSession, Topic } from '@/shared/types/chat'

type ChatStatus = 'idle' | 'loading' | 'sending' | 'error'

type UploadPipelineState = {
  sessionId: string
  sourceName: string
  sourceText: string
  topic: Topic
}

type ChatStore = {
  persistence: ChatPersistence | null
  sessions: ChatSession[]
  activeSessionId: string | null
  topicDraft: Topic
  modeDraft: ChatMode
  learnerName: string | null
  requiresModeSelection: boolean
  uploadPipeline: UploadPipelineState | null
  status: ChatStatus
  error: string | null
  isStreaming: boolean
  streamingMessageId: string | null
  abortController: AbortController | null
  drillStatsBySession: Record<string, { attempted: number; correct: number }>
  drillAnsweredBySession: Record<string, string[]>
  savedUploadPackMessageIdsBySession: Record<string, string[]>

  bootstrap: (userId: string | null) => Promise<void>
  setTopicDraft: (topic: Topic) => void
  setModeDraft: (mode: ChatMode) => void
  setLearnerName: (name: string | null) => void
  selectSession: (sessionId: string | null) => Promise<void>
  createSession: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  sendUserMessage: (content: string) => Promise<void>
  editLatestUserMessage: (content: string) => Promise<void>
  uploadStudyFile: (file: File) => Promise<void>
  completeUploadWithIntent: (intent: UploadPackIntent, focusNotes?: string) => Promise<void>
  clearUploadPipeline: () => void
  requestNextDrillQuestion: () => Promise<void>
  submitDrillAnswer: (sessionId: string, messageId: string, isCorrect: boolean) => void
  saveUploadPack: (messageId: string, sourceName: string, packJson: string) => Promise<void>
  stopGeneration: () => void
  regenerateLastReply: () => Promise<void>
  clearError: () => void
}

function newMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

function insertMessage(sessions: ChatSession[], sessionId: string, message: ChatMessage): ChatSession[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, messages: [...session.messages, message] } : session,
  )
}

function removeLastMessageForRole(
  sessions: ChatSession[],
  sessionId: string,
  role: ChatMessage['role'],
): ChatSession[] {
  return sessions.map((session) => {
    if (session.id !== sessionId) return session

    const messages = [...session.messages]
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === role) {
        messages.splice(index, 1)
        break
      }
    }

    return { ...session, messages }
  })
}

function sessionHasUserMessage(session: ChatSession | undefined): boolean {
  return Boolean(session?.messages.some((message) => message.role === 'user'))
}

function deriveSessionTitleFromText(input: string): string {
  const cleaned = input
    .replace(/\s+/g, ' ')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .trim()
  if (!cleaned) return 'New session'
  const clipped = cleaned.length > 52 ? `${cleaned.slice(0, 52).trim()}…` : cleaned
  return clipped
}

function deriveSessionTitleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '').trim()
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  const title = cleaned || fileName
  return title.length > 52 ? `${title.slice(0, 52).trim()}…` : title
}

function updateMessageContent(
  sessions: ChatSession[],
  sessionId: string,
  messageId: string,
  content: string,
): ChatSession[] {
  return sessions.map((session) => {
    if (session.id !== sessionId) return session
    return {
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId ? { ...message, content } : message,
      ),
    }
  })
}

async function generateAssistantReply(
  sessionId: string,
  assistantMessage: ChatMessage,
  contextMessages: ChatMessage[],
): Promise<void> {
  const { sessions, persistence, abortController } = useChatStore.getState()
  const activeSession = sessions.find((session) => session.id === sessionId)
  if (!activeSession || !persistence) {
    useChatStore.setState({ status: 'idle', isStreaming: false, streamingMessageId: null, abortController: null })
    return
  }

  let assistantReply = ''
  const controller = abortController ?? new AbortController()
  useChatStore.setState({
    abortController: controller,
    isStreaming: true,
    streamingMessageId: assistantMessage.id,
    status: 'sending',
  })

  try {
    const learnerName = useChatStore.getState().learnerName
    assistantReply = await streamAssistantReply(
      activeSession.topic,
      activeSession.mode,
      contextMessages,
      learnerName,
      {
      signal: controller.signal,
      onChunk: (chunk) => {
        assistantReply += chunk
        useChatStore.setState((state) => ({
          sessions: updateMessageContent(
            state.sessions,
            sessionId,
            assistantMessage.id,
            assistantReply,
          ),
        }))
      },
    },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate assistant reply'
    const cancelled = error instanceof Error && error.name === 'AbortError'
    useChatStore.setState((state) => ({
      sessions: removeLastMessageForRole(state.sessions, sessionId, 'assistant'),
      status: 'idle',
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
      error: cancelled ? null : message,
    }))
    return
  }

  try {
    await persistence.saveMessage(sessionId, { ...assistantMessage, content: assistantReply })
    useChatStore.setState({
      status: 'idle',
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
    })
  } catch (error) {
    useChatStore.setState((state) => ({
      sessions: removeLastMessageForRole(state.sessions, sessionId, 'assistant'),
      status: 'idle',
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
      error: error instanceof Error ? error.message : 'Failed to save assistant reply',
    }))
  }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  persistence: null,
  sessions: [],
  activeSessionId: null,
  topicDraft: DEFAULT_TOPIC,
  modeDraft: DEFAULT_CHAT_MODE,
  learnerName: null,
  requiresModeSelection: true,
  uploadPipeline: null,
  status: 'idle',
  error: null,
  isStreaming: false,
  streamingMessageId: null,
  abortController: null,
  drillStatsBySession: {},
  drillAnsweredBySession: {},
  savedUploadPackMessageIdsBySession: {},

  clearError: () => set({ error: null }),

  setLearnerName: (name) =>
    set({
      learnerName: name?.trim() ? name.trim() : null,
    }),

  bootstrap: async (userId) => {
    set({ status: 'loading', error: null })
    try {
      const persistence = createChatPersistence(userId)
      const sessions = await persistence.fetchSessions()
      const drillStatsBySession = await persistence.fetchDrillStats()
      const preferredId = await persistence.getInitialActiveSessionId()

      const activeSessionId =
        preferredId && sessions.some((session) => session.id === preferredId)
          ? preferredId
          : sessions[0]?.id ?? null

      const activeSession = activeSessionId
        ? sessions.find((session) => session.id === activeSessionId)
        : undefined

      set({
        persistence,
        sessions,
        activeSessionId,
        topicDraft: activeSessionId
          ? (sessions.find((session) => session.id === activeSessionId)?.topic ?? DEFAULT_TOPIC)
          : DEFAULT_TOPIC,
        modeDraft: activeSessionId
          ? (sessions.find((session) => session.id === activeSessionId)?.mode ?? DEFAULT_CHAT_MODE)
          : DEFAULT_CHAT_MODE,
        requiresModeSelection: !sessionHasUserMessage(activeSession),
        uploadPipeline: null,
        drillStatsBySession,
        status: 'idle',
      })
    } catch (error) {
      console.error(error)
      set({
        persistence: null,
        sessions: [],
        activeSessionId: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load chat',
      })
    }
  },

  selectSession: async (sessionId) => {
    const { persistence, sessions, uploadPipeline } = get()
    const session = sessions.find((entry) => entry.id === sessionId)
    set({
      activeSessionId: sessionId,
      topicDraft: session?.topic ?? DEFAULT_TOPIC,
      modeDraft: session?.mode ?? DEFAULT_CHAT_MODE,
      requiresModeSelection: !sessionHasUserMessage(session),
      uploadPipeline: sessionId && uploadPipeline?.sessionId === sessionId ? uploadPipeline : null,
    })
    if (!persistence) return
    await persistence.persistActiveSessionId(sessionId)
  },

  createSession: async () => {
    const { persistence, topicDraft, modeDraft } = get()
    if (!persistence) return

    set({ status: 'loading', error: null })

    try {
      const session = await persistence.createSession(topicDraft)
      if (modeDraft !== session.mode) {
        await persistence.updateSession(session.id, { mode: modeDraft })
      }
      set((state) => ({
        sessions: [{ ...session, mode: modeDraft }, ...state.sessions],
        activeSessionId: session.id,
        topicDraft: session.topic,
        modeDraft,
        requiresModeSelection: true,
        uploadPipeline: null,
        status: 'idle',
      }))
      await persistence.persistActiveSessionId(session.id)
    } catch (error) {
      console.error(error)
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to create session',
      })
    }
  },

  deleteSession: async (sessionId) => {
    const { persistence, activeSessionId } = get()
    if (!persistence) return

    set({ status: 'loading', error: null })

    try {
      await persistence.deleteSession(sessionId)
      const sessions = get().sessions.filter((session) => session.id !== sessionId)
      const nextActive =
        activeSessionId === sessionId ? sessions[0]?.id ?? null : activeSessionId

      set({
        sessions,
        activeSessionId: nextActive,
        drillStatsBySession: Object.fromEntries(
          Object.entries(get().drillStatsBySession).filter(([sid]) => sid !== sessionId),
        ),
        drillAnsweredBySession: Object.fromEntries(
          Object.entries(get().drillAnsweredBySession).filter(([sid]) => sid !== sessionId),
        ),
        savedUploadPackMessageIdsBySession: Object.fromEntries(
          Object.entries(get().savedUploadPackMessageIdsBySession).filter(([sid]) => sid !== sessionId),
        ),
        uploadPipeline: null,
        status: 'idle',
      })
      await persistence.persistActiveSessionId(nextActive)
    } catch (error) {
      console.error(error)
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to delete chat',
      })
    }
  },

  sendUserMessage: async (content) => {
    const trimmed = content.trim()
    const { persistence, activeSessionId, sessions, isStreaming, requiresModeSelection, modeDraft } = get()

    if (!trimmed || !activeSessionId || !persistence || isStreaming) return
    if (requiresModeSelection) {
      set({
        requiresModeSelection: false,
      })
      void persistence.updateSession(activeSessionId, { mode: modeDraft })
    }

    const activeSessionBeforeInsert = sessions.find((session) => session.id === activeSessionId)
    const isFirstUserMessage = !activeSessionBeforeInsert?.messages.some((m) => m.role === 'user')

    const userMessage = newMessage('user', trimmed)

    set((state) => ({
      sessions: insertMessage(state.sessions, activeSessionId, userMessage),
      status: 'sending',
      error: null,
    }))

    try {
      await persistence.saveMessage(activeSessionId, userMessage)
      if (isFirstUserMessage && activeSessionBeforeInsert?.title === 'New session') {
        const fallbackTitle = deriveSessionTitleFromText(trimmed)
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId ? { ...session, title: fallbackTitle } : session,
          ),
        }))
        await persistence.updateSession(activeSessionId, { title: fallbackTitle })
        void requestSessionTitle(
          activeSessionBeforeInsert.topic,
          activeSessionBeforeInsert.mode,
          [...activeSessionBeforeInsert.messages, userMessage],
          get().learnerName,
        ).then((aiTitle) => {
          if (!aiTitle || aiTitle === fallbackTitle) return
          const hasSession = useChatStore.getState().sessions.some((s) => s.id === activeSessionId)
          if (!hasSession) return
          useChatStore.setState((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === activeSessionId ? { ...session, title: aiTitle } : session,
            ),
          }))
          void persistence.updateSession(activeSessionId, { title: aiTitle })
        })
      }
    } catch (error) {
      console.error(error)
      set((state) => ({
        sessions: removeLastMessageForRole(state.sessions, activeSessionId, 'user'),
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to save message',
      }))
      return
    }

    const activeSession = sessions.find((session) => session.id === activeSessionId)
    if (!activeSession) {
      set({ status: 'idle', error: 'No active session selected' })
      return
    }

    if (activeSession.mode === 'drill') {
      try {
        const mcq = await requestDrillMcq(
          activeSession.topic,
          activeSession.mode,
          [...activeSession.messages, userMessage],
          get().learnerName,
        )
        const assistantMessage = newMessage('assistant', `${MCQ_MESSAGE_PREFIX}${JSON.stringify(mcq)}`)
        set((state) => ({
          sessions: insertMessage(state.sessions, activeSessionId, assistantMessage),
          status: 'sending',
        }))
        await persistence.saveMessage(activeSessionId, assistantMessage)
        set({ status: 'idle' })
      } catch (error) {
        set({
          status: 'idle',
          error: error instanceof Error ? error.message : 'Failed to generate drill question',
        })
      }
      return
    }

    const assistantMessage = newMessage('assistant', '')

    set((state) => ({
      sessions: insertMessage(state.sessions, activeSessionId, assistantMessage),
    }))

    await generateAssistantReply(activeSessionId, assistantMessage, [...activeSession.messages, userMessage])
  },

  editLatestUserMessage: async (content) => {
    const trimmed = content.trim()
    const { activeSessionId, sessions, persistence, isStreaming } = get()
    if (!trimmed || !activeSessionId || !persistence || isStreaming) return

    const session = sessions.find((entry) => entry.id === activeSessionId)
    if (!session) return

    const messages = [...session.messages]
    const latestUserIndex = [...messages].reverse().findIndex((message) => message.role === 'user')
    if (latestUserIndex < 0) return
    const absoluteUserIndex = messages.length - 1 - latestUserIndex
    const latestUser = messages[absoluteUserIndex]
    if (!latestUser) return

    const contextAfterEdit = messages
      .slice(0, absoluteUserIndex + 1)
      .map((message, idx) =>
        idx === absoluteUserIndex ? { ...message, content: trimmed } : message,
      )

    set((state) => ({
      sessions: state.sessions.map((entry) =>
        entry.id === activeSessionId
          ? { ...entry, messages: contextAfterEdit }
          : entry,
      ),
      status: 'sending',
      error: null,
    }))

    try {
      await persistence.updateMessage(activeSessionId, latestUser.id, trimmed)
    } catch (error) {
      set({
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to edit message',
      })
      return
    }

    const replacementAssistant = newMessage('assistant', '')
    set((state) => ({
      sessions: insertMessage(state.sessions, activeSessionId, replacementAssistant),
    }))

    await generateAssistantReply(activeSessionId, replacementAssistant, contextAfterEdit)
  },

  uploadStudyFile: async (file) => {
    const { persistence, activeSessionId, topicDraft, isStreaming, requiresModeSelection } = get()
    if (!persistence || isStreaming) return
    if (requiresModeSelection) {
      set({
        error: 'Please select a mode first (Tutor, Topic Explainer, or MCQ Practice), then upload your document.',
      })
      return
    }

    let sessionId = activeSessionId
    if (!sessionId) {
      const hadPickedMode = !get().requiresModeSelection
      await get().createSession()
      sessionId = get().activeSessionId
      if (hadPickedMode) {
        set({ requiresModeSelection: false })
      }
    }
    if (!sessionId) return

    const activeSession = get().sessions.find((session) => session.id === sessionId)
    const resolvedTopic = activeSession?.topic ?? topicDraft

    const uploadNotice = newMessage('user', `Uploaded file: ${file.name}`)
    set((state) => ({
      sessions: insertMessage(state.sessions, sessionId!, uploadNotice),
      uploadPipeline: null,
      status: 'sending',
      error: null,
    }))

    try {
      await persistence.saveMessage(sessionId, uploadNotice)

      if (activeSession?.title === 'New session') {
        const fallbackTitle = deriveSessionTitleFromFileName(file.name)
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, title: fallbackTitle } : session,
          ),
        }))
        await persistence.updateSession(sessionId, { title: fallbackTitle })
        void requestSessionTitle(
          activeSession?.topic ?? topicDraft,
          activeSession?.mode ?? 'tutor',
          [uploadNotice],
          get().learnerName,
        ).then(
          (aiTitle) => {
            if (!aiTitle || aiTitle === fallbackTitle) return
            const hasSession = useChatStore.getState().sessions.some((s) => s.id === sessionId)
            if (!hasSession) return
            useChatStore.setState((state) => ({
              sessions: state.sessions.map((session) =>
                session.id === sessionId ? { ...session, title: aiTitle } : session,
              ),
            }))
            void persistence.updateSession(sessionId, { title: aiTitle })
          },
        )
      }

      const extracted = await extractUploadText(file)
      set((state) => ({
        sessions: state.sessions,
        uploadPipeline: {
          sessionId,
          sourceName: file.name,
          sourceText: extracted.text,
          topic: resolvedTopic,
        },
        status: 'idle',
      }))
    } catch (error) {
      set({
        status: 'idle',
        uploadPipeline: null,
        error: error instanceof Error ? error.message : 'Failed to process uploaded file',
      })
    }
  },

  clearUploadPipeline: () => set({ uploadPipeline: null }),

  completeUploadWithIntent: async (intent, focusNotes) => {
    const { persistence, activeSessionId, uploadPipeline } = get()
    if (!persistence || !uploadPipeline || uploadPipeline.sessionId !== activeSessionId) return

    const { sessionId, sourceName, sourceText, topic } = uploadPipeline
    if (!get().sessions.some((s) => s.id === sessionId)) return

    const intentLabel =
      intent === 'summary_only'
        ? 'Summary only'
        : intent === 'quiz_only'
          ? 'Quiz only'
          : intent === 'custom_focus'
            ? 'Summary + quiz (custom focus)'
            : 'Summary + quiz'

    const userPick = newMessage(
      'user',
      focusNotes?.trim() && intent === 'custom_focus'
        ? `Study actions: ${intentLabel}. Focus: ${focusNotes.trim()}`
        : `Study actions: ${intentLabel}`,
    )

    set({
      uploadPipeline: null,
      status: 'sending',
      error: null,
    })

    set((state) => ({
      sessions: insertMessage(state.sessions, sessionId, userPick),
    }))

    try {
      await persistence.saveMessage(sessionId, userPick)
      const pack = await requestUploadStudyPack({
        topic,
        sourceText,
        sourceName,
        intent,
        focusNotes: intent === 'custom_focus' ? focusNotes : undefined,
        learnerName: get().learnerName,
      })
      const assistantMessage = newMessage('assistant', `${UPLOAD_PACK_PREFIX}${JSON.stringify(pack)}`)
      set((state) => ({
        sessions: insertMessage(state.sessions, sessionId, assistantMessage),
        status: 'idle',
      }))
      await persistence.saveMessage(sessionId, assistantMessage)
    } catch (error) {
      set({
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to build content from upload',
      })
    }
  },

  requestNextDrillQuestion: async () => {
    const { activeSessionId, sessions, persistence, isStreaming } = get()
    if (!activeSessionId || !persistence || isStreaming) return
    const activeSession = sessions.find((session) => session.id === activeSessionId)
    if (!activeSession || activeSession.mode !== 'drill') return

    set({ status: 'sending', error: null })
    try {
      const syntheticPrompt = newMessage(
        'user',
        'Give me the next NCLEX-style question in the same topic. Do not repeat the last question.',
      )
      const mcq = await requestDrillMcq(
        activeSession.topic,
        activeSession.mode,
        [...activeSession.messages, syntheticPrompt],
        get().learnerName,
      )
      const assistantMessage = newMessage('assistant', `${MCQ_MESSAGE_PREFIX}${JSON.stringify(mcq)}`)
      set((state) => ({
        sessions: insertMessage(state.sessions, activeSessionId, assistantMessage),
      }))
      await persistence.saveMessage(activeSessionId, assistantMessage)
      set({ status: 'idle' })
    } catch (error) {
      set({
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to generate next question',
      })
    }
  },

  submitDrillAnswer: (sessionId, messageId, isCorrect) => {
    const { drillAnsweredBySession, drillStatsBySession, sessions, persistence } = get()
    const alreadyAnswered = (drillAnsweredBySession[sessionId] ?? []).includes(messageId)
    if (alreadyAnswered) return

    const current = drillStatsBySession[sessionId] ?? { attempted: 0, correct: 0 }
    set({
      drillAnsweredBySession: {
        ...drillAnsweredBySession,
        [sessionId]: [...(drillAnsweredBySession[sessionId] ?? []), messageId],
      },
      drillStatsBySession: {
        ...drillStatsBySession,
        [sessionId]: {
          attempted: current.attempted + 1,
          correct: current.correct + (isCorrect ? 1 : 0),
        },
      },
    })

    const session = sessions.find((entry) => entry.id === sessionId)
    if (persistence && session) {
      void persistence.recordDrillAnswer({
        sessionId,
        topic: session.topic,
        messageId,
        isCorrect,
      })
    }
  },

  saveUploadPack: async (messageId, sourceName, packJson) => {
    const { activeSessionId, sessions, persistence } = get()
    if (!activeSessionId || !persistence) return

    const session = sessions.find((entry) => entry.id === activeSessionId)
    if (!session) return

    try {
      const parsed = JSON.parse(packJson) as {
        summary?: string[]
        quiz?: Array<{ question: string; options: string[]; correctIndex: number; rationale: string }>
      }
      if (!Array.isArray(parsed.summary) || !Array.isArray(parsed.quiz)) return
      if (parsed.summary.length === 0 && parsed.quiz.length === 0) return
      await persistence.saveUploadStudyPack({
        sessionId: activeSessionId,
        topic: session.topic,
        sourceName,
        pack: {
          summary: parsed.summary,
          quiz: parsed.quiz,
        },
      })

      set((state) => ({
        savedUploadPackMessageIdsBySession: {
          ...state.savedUploadPackMessageIdsBySession,
          [activeSessionId]: [
            ...(state.savedUploadPackMessageIdsBySession[activeSessionId] ?? []),
            messageId,
          ],
        },
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save upload pack',
      })
    }
  },

  setModeDraft: (mode) => {
    const { activeSessionId, persistence } = get()
    set((state) => ({
      modeDraft: mode,
      requiresModeSelection: false,
      sessions: activeSessionId
        ? state.sessions.map((session) =>
            session.id === activeSessionId ? { ...session, mode } : session,
          )
        : state.sessions,
    }))
    if (persistence && activeSessionId) {
      void persistence.updateSession(activeSessionId, { mode })
    }
  },

  setTopicDraft: (topic) => {
    const { activeSessionId, persistence } = get()
    set((state) => ({
      topicDraft: topic,
      sessions: activeSessionId
        ? state.sessions.map((session) =>
            session.id === activeSessionId ? { ...session, topic } : session,
          )
        : state.sessions,
    }))
    if (persistence && activeSessionId) {
      void persistence.updateSession(activeSessionId, { topic })
    }
  },

  stopGeneration: () => {
    const { abortController } = get()
    if (!abortController) return
    abortController.abort()
  },

  regenerateLastReply: async () => {
    const { activeSessionId, sessions, persistence, isStreaming } = get()
    if (!activeSessionId || !persistence || isStreaming) return

    const session = sessions.find((item) => item.id === activeSessionId)
    if (!session || session.messages.length === 0) return

    const messages = [...session.messages]
    const lastAssistantIndex = [...messages].reverse().findIndex((msg) => msg.role === 'assistant')
    if (lastAssistantIndex < 0) return
    const absoluteAssistantIndex = messages.length - 1 - lastAssistantIndex
    const lastAssistant = messages[absoluteAssistantIndex]
    if (!lastAssistant) return

    const context = messages.slice(0, absoluteAssistantIndex)
    const hasUserContext = context.some((msg) => msg.role === 'user')
    if (!hasUserContext) return

    set({
      sessions: sessions.map((item) =>
        item.id === activeSessionId
          ? { ...item, messages: item.messages.filter((msg) => msg.id !== lastAssistant.id) }
          : item,
      ),
      error: null,
      status: 'sending',
    })

    const replacementAssistant = newMessage('assistant', '')
    set((state) => ({
      sessions: insertMessage(state.sessions, activeSessionId, replacementAssistant),
    }))

    await generateAssistantReply(activeSessionId, replacementAssistant, context)
  },
}))
