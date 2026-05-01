import type { ChatPersistence } from '@/features/chat/services/chat-persistence'
import type { ChatMessage, ChatSession, Topic } from '@/shared/types/chat'

const STORAGE_KEY = 'nurseai.chat.v1'

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

export class LocalChatPersistence implements ChatPersistence {
  async fetchSessions(): Promise<ChatSession[]> {
    const data = readRaw()
    return data?.sessions ?? []
  }

  async getInitialActiveSessionId(): Promise<string | null> {
    return readRaw()?.activeSessionId ?? null
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
