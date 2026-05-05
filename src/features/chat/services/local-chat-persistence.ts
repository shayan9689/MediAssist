import type { ChatPersistence } from '@/features/chat/services/chat-persistence'
import type { UploadStudyPack } from '@/features/chat/services/chat-api'
import type { ChatMessage, ChatMode, ChatSession, Topic } from '@/shared/types/chat'

const STORAGE_KEY = 'nurseai.chat.v1'
const DRILL_STATS_KEY = 'nurseai.drill.stats.v1'
const UPLOAD_PACKS_KEY = 'nurseai.upload.packs.v1'

type PersistedV1 = {
  version: 1
  activeSessionId: string | null
  sessions: ChatSession[]
}

function readRaw(): PersistedV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedV1
    if (parsed?.version !== 1 || !Array.isArray(parsed.sessions)) return null
    return parsed
  } catch {
    return null
  }
}

function writeRaw(state: PersistedV1) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function normalizeMode(mode: unknown): ChatMode {
  return mode === 'explainer' || mode === 'drill' ? mode : 'tutor'
}

function readDrillStats(): Record<string, { attempted: number; correct: number }> {
  try {
    const raw = localStorage.getItem(DRILL_STATS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, { attempted: number; correct: number }>
    return parsed ?? {}
  } catch {
    return {}
  }
}

function writeDrillStats(stats: Record<string, { attempted: number; correct: number }>) {
  localStorage.setItem(DRILL_STATS_KEY, JSON.stringify(stats))
}

function readUploadPacks(): Array<{
  id: string
  sessionId: string
  topic: Topic
  sourceName: string
  createdAt: string
  pack: UploadStudyPack
}> {
  try {
    const raw = localStorage.getItem(UPLOAD_PACKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{
      id: string
      sessionId: string
      topic: Topic
      sourceName: string
      createdAt: string
      pack: UploadStudyPack
    }>
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUploadPacks(
  rows: Array<{
    id: string
    sessionId: string
    topic: Topic
    sourceName: string
    createdAt: string
    pack: UploadStudyPack
  }>,
) {
  localStorage.setItem(UPLOAD_PACKS_KEY, JSON.stringify(rows))
}

export class LocalChatPersistence implements ChatPersistence {
  async fetchSessions(): Promise<ChatSession[]> {
    const data = readRaw()
    return (data?.sessions ?? []).map((session) => ({
      ...session,
      mode: normalizeMode((session as Partial<ChatSession>).mode),
    }))
  }

  async getInitialActiveSessionId(): Promise<string | null> {
    return readRaw()?.activeSessionId ?? null
  }

  async fetchDrillStats(): Promise<Record<string, { attempted: number; correct: number }>> {
    return readDrillStats()
  }

  async saveUploadStudyPack(params: {
    sessionId: string
    topic: Topic
    sourceName: string
    pack: UploadStudyPack
  }): Promise<void> {
    const rows = readUploadPacks()
    rows.unshift({
      id: crypto.randomUUID(),
      sessionId: params.sessionId,
      topic: params.topic,
      sourceName: params.sourceName,
      createdAt: new Date().toISOString(),
      pack: params.pack,
    })
    writeUploadPacks(rows.slice(0, 200))
  }

  async persistActiveSessionId(sessionId: string | null): Promise<void> {
    const data = readRaw()
    if (!data) return
    writeRaw({ ...data, activeSessionId: sessionId })
  }

  async createSession(topic: Topic): Promise<ChatSession> {
    const data = readRaw()
    const sessions = data?.sessions ?? []
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New session',
      topic,
      mode: 'tutor',
      createdAt: new Date().toISOString(),
      messages: [],
    }
    const next = [session, ...sessions]
    writeRaw({
      version: 1,
      activeSessionId: session.id,
      sessions: next,
    })
    return session
  }

  async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const data = readRaw()
    const sessions = data?.sessions ?? []
    const nextSessions = sessions.map((session) =>
      session.id === sessionId
        ? { ...session, messages: [...session.messages, message] }
        : session,
    )
    writeRaw({
      version: 1,
      activeSessionId: data?.activeSessionId ?? sessionId,
      sessions: nextSessions,
    })
  }

  async updateMessage(sessionId: string, messageId: string, content: string): Promise<void> {
    const data = readRaw()
    const sessions = data?.sessions ?? []
    const nextSessions = sessions.map((session) => {
      if (session.id !== sessionId) return session
      return {
        ...session,
        messages: session.messages.map((message) =>
          message.id === messageId ? { ...message, content } : message,
        ),
      }
    })
    writeRaw({
      version: 1,
      activeSessionId: data?.activeSessionId ?? sessionId,
      sessions: nextSessions,
    })
  }

  async recordDrillAnswer(params: {
    sessionId: string
    topic: Topic
    messageId: string
    isCorrect: boolean
  }): Promise<void> {
    void params.topic
    void params.messageId
    const stats = readDrillStats()
    const current = stats[params.sessionId] ?? { attempted: 0, correct: 0 }
    stats[params.sessionId] = {
      attempted: current.attempted + 1,
      correct: current.correct + (params.isCorrect ? 1 : 0),
    }
    writeDrillStats(stats)
  }

  async updateSession(sessionId: string, updates: { title?: string; topic?: Topic; mode?: ChatMode }): Promise<void> {
    const data = readRaw()
    const sessions = data?.sessions ?? []
    const nextSessions = sessions.map((session) => {
      if (session.id !== sessionId) return session
      return {
        ...session,
        ...(updates.title ? { title: updates.title } : null),
        ...(updates.topic ? { topic: updates.topic } : null),
        ...(updates.mode ? { mode: updates.mode } : null),
      }
    })

    writeRaw({
      version: 1,
      activeSessionId: data?.activeSessionId ?? sessionId,
      sessions: nextSessions,
    })
  }

  async deleteSession(sessionId: string): Promise<void> {
    const data = readRaw()
    const sessions = data?.sessions ?? []
    const nextSessions = sessions.filter((session) => session.id !== sessionId)
    let activeSessionId = data?.activeSessionId ?? null

    if (activeSessionId === sessionId) {
      activeSessionId = nextSessions[0]?.id ?? null
    }

    writeRaw({
      version: 1,
      activeSessionId,
      sessions: nextSessions,
    })
  }
}
