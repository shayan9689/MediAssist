import { create } from 'zustand'
import { DEFAULT_TOPIC } from '@/features/chat/constants/topics'
import { createChatPersistence } from '@/features/chat/services/create-chat-persistence'
import type { ChatPersistence } from '@/features/chat/services/chat-persistence'
import type { ChatMessage, ChatSession, Topic } from '@/shared/types/chat'

type ChatStatus = 'idle' | 'loading' | 'sending' | 'error'

type ChatStore = {
  persistence: ChatPersistence | null
  sessions: ChatSession[]
  activeSessionId: string | null
  topicDraft: Topic
  status: ChatStatus
  error: string | null

  bootstrap: (userId: string | null) => Promise<void>
  setTopicDraft: (topic: Topic) => void
  selectSession: (sessionId: string | null) => Promise<void>
  createSession: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  sendUserMessage: (content: string) => Promise<void>
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

const ASSISTANT_STUB =
  'Thanks for your message. A full tutor reply will show here once the assistant is connected.'

export const useChatStore = create<ChatStore>((set, get) => ({
  persistence: null,
  sessions: [],
  activeSessionId: null,
  topicDraft: DEFAULT_TOPIC,
  status: 'idle',
  error: null,

  clearError: () => set({ error: null }),

  bootstrap: async (userId) => {
    set({ status: 'loading', error: null })
    try {
      const persistence = createChatPersistence(userId)
      const sessions = await persistence.fetchSessions()
      const preferredId = await persistence.getInitialActiveSessionId()

      const activeSessionId =
        preferredId && sessions.some((session) => session.id === preferredId)
          ? preferredId
          : sessions[0]?.id ?? null

      set({
        persistence,
        sessions,
        activeSessionId,
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

  setTopicDraft: (topic) => set({ topicDraft: topic }),

  selectSession: async (sessionId) => {
    const { persistence } = get()
    set({ activeSessionId: sessionId })
    if (!persistence) return
    await persistence.persistActiveSessionId(sessionId)
  },

  createSession: async () => {
    const { persistence, topicDraft } = get()
    if (!persistence) return

    set({ status: 'loading', error: null })

    try {
      const session = await persistence.createSession(topicDraft)
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: session.id,
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
    const { persistence, activeSessionId } = get()

    if (!trimmed || !activeSessionId || !persistence) return

    const userMessage = newMessage('user', trimmed)

    set((state) => ({
      sessions: insertMessage(state.sessions, activeSessionId, userMessage),
      status: 'sending',
      error: null,
    }))

    try {
      await persistence.saveMessage(activeSessionId, userMessage)
    } catch (error) {
      console.error(error)
      set((state) => ({
        sessions: removeLastMessageForRole(state.sessions, activeSessionId, 'user'),
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to save message',
      }))
      return
    }

    const assistantMessage = newMessage('assistant', ASSISTANT_STUB)

    set((state) => ({
      sessions: insertMessage(state.sessions, activeSessionId, assistantMessage),
    }))

    try {
      await persistence.saveMessage(activeSessionId, assistantMessage)
      set({ status: 'idle' })
    } catch (error) {
      console.error(error)
      set((state) => ({
        sessions: removeLastMessageForRole(state.sessions, activeSessionId, 'assistant'),
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to save assistant reply',
      }))
    }
  },
}))
