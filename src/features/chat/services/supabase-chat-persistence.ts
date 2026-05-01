import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatPersistence } from '@/features/chat/services/chat-persistence'
import type { ChatMessage, ChatSession, Topic } from '@/shared/types/chat'

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

function mapSession(row: SessionRow, messages: ChatMessage[]): ChatSession {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
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
