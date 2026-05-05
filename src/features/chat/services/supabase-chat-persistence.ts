import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatPersistence } from '@/features/chat/services/chat-persistence'
import type { UploadStudyPack } from '@/features/chat/services/chat-api'
import type { ChatMessage, ChatMode, ChatSession, Topic } from '@/shared/types/chat'

type SessionRow = {
  id: string
  user_id: string
  title: string
  topic: Topic
  created_at: string
}

type MessageRow = {
  id: string
  session_id: string
  role: ChatMessage['role']
  content: string
  created_at: string
}

type QuizAttemptRow = {
  session_id?: string
  score: number
  total: number
}

const MODE_PREFS_KEY = 'nurseai.chat.modeprefs.v1'

function readModePrefs(): Record<string, ChatMode> {
  try {
    const raw = localStorage.getItem(MODE_PREFS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ChatMode>
    return parsed ?? {}
  } catch {
    return {}
  }
}

function writeModePrefs(next: Record<string, ChatMode>) {
  localStorage.setItem(MODE_PREFS_KEY, JSON.stringify(next))
}

function mapSession(row: SessionRow, messages: ChatMessage[]): ChatSession {
  const modePrefs = readModePrefs()
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    mode: modePrefs[row.id] ?? 'tutor',
    createdAt: row.created_at,
    messages,
  }
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

export class SupabaseChatPersistence implements ChatPersistence {
  private readonly client: SupabaseClient

  private readonly userId: string

  constructor(client: SupabaseClient, userId: string) {
    this.client = client
    this.userId = userId
  }

  async fetchSessions(): Promise<ChatSession[]> {
    const { data: sessionRows, error: sessionError } = await this.client
      .from('chat_sessions')
      .select('id,user_id,title,topic,created_at')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })

    if (sessionError) throw sessionError

    const sessions = (sessionRows ?? []) as SessionRow[]
    const ids = sessions.map((row) => row.id)

    if (ids.length === 0) return []

    const { data: messageRows, error: messageError } = await this.client
      .from('messages')
      .select('id,session_id,role,content,created_at')
      .in('session_id', ids)
      .order('created_at', { ascending: true })

    if (messageError) throw messageError

    const messagesBySession = new Map<string, ChatMessage[]>()

    for (const row of (messageRows ?? []) as MessageRow[]) {
      const list = messagesBySession.get(row.session_id) ?? []
      list.push(mapMessage(row))
      messagesBySession.set(row.session_id, list)
    }

    return sessions.map((row) => mapSession(row, messagesBySession.get(row.id) ?? []))
  }

  async fetchDrillStats(): Promise<Record<string, { attempted: number; correct: number }>> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('score,total,questions')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    const stats: Record<string, { attempted: number; correct: number }> = {}
    for (const row of (data ?? []) as Array<{ score: number; total: number; questions: unknown }>) {
      const questions = Array.isArray(row.questions) ? row.questions : []
      const first = questions[0] as QuizAttemptRow | undefined
      const sessionId = typeof first?.session_id === 'string' ? first.session_id : undefined
      if (!sessionId) continue

      const current = stats[sessionId] ?? { attempted: 0, correct: 0 }
      stats[sessionId] = {
        attempted: current.attempted + (row.total ?? 0),
        correct: current.correct + (row.score ?? 0),
      }
    }
    return stats
  }

  async saveUploadStudyPack(params: {
    sessionId: string
    topic: Topic
    sourceName: string
    pack: UploadStudyPack
  }): Promise<void> {
    const { error } = await this.client.from('upload_packs').insert({
      user_id: this.userId,
      session_id: params.sessionId,
      source_name: params.sourceName,
      topic: params.topic,
      summary: params.pack.summary,
      quiz: params.pack.quiz,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  async createSession(topic: Topic): Promise<ChatSession> {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    const { error } = await this.client.from('chat_sessions').insert({
      id,
      user_id: this.userId,
      title: 'New session',
      topic,
      created_at: createdAt,
    })

    if (error) throw error

    return {
      id,
      title: 'New session',
      topic,
      mode: 'tutor',
      createdAt,
      messages: [],
    }
  }

  async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const { error } = await this.client.from('messages').insert({
      id: message.id,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
    })

    if (error) throw error
  }

  async updateMessage(sessionId: string, messageId: string, content: string): Promise<void> {
    const { error } = await this.client
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .eq('session_id', sessionId)

    if (error) throw error
  }

  async recordDrillAnswer(params: {
    sessionId: string
    topic: Topic
    messageId: string
    isCorrect: boolean
  }): Promise<void> {
    const { error } = await this.client.from('quiz_attempts').insert({
      user_id: this.userId,
      topic: params.topic,
      score: params.isCorrect ? 1 : 0,
      total: 1,
      questions: [{ session_id: params.sessionId, message_id: params.messageId, mode: 'drill' }],
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  async updateSession(sessionId: string, updates: { title?: string; topic?: Topic; mode?: ChatMode }): Promise<void> {
    if (updates.title) {
      const { error } = await this.client
        .from('chat_sessions')
        .update({ title: updates.title })
        .eq('id', sessionId)
        .eq('user_id', this.userId)

      if (error) throw error
    }

    if (updates.topic) {
      const { error } = await this.client
        .from('chat_sessions')
        .update({ topic: updates.topic })
        .eq('id', sessionId)
        .eq('user_id', this.userId)

      if (error) throw error
    }

    if (updates.mode) {
      const prefs = readModePrefs()
      prefs[sessionId] = updates.mode
      writeModePrefs(prefs)
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', this.userId)

    if (error) throw error
  }

  async getInitialActiveSessionId(): Promise<string | null> {
    return null
  }

  async persistActiveSessionId(sessionId: string | null): Promise<void> {
    void sessionId
    /* Server-side session selection is kept in memory only for now */
  }
}
