import type { ChatMessage, ChatMode, ChatSession, Topic } from '@/shared/types/chat'
import type { UploadStudyPack } from '@/features/chat/services/chat-api'

export type ChatPersistence = {
  fetchSessions(): Promise<ChatSession[]>
  fetchDrillStats(): Promise<Record<string, { attempted: number; correct: number }>>
  saveUploadStudyPack(params: {
    sessionId: string
    topic: Topic
    sourceName: string
    pack: UploadStudyPack
  }): Promise<void>
  createSession(topic: Topic): Promise<ChatSession>
  saveMessage(sessionId: string, message: ChatMessage): Promise<void>
  updateMessage(sessionId: string, messageId: string, content: string): Promise<void>
  recordDrillAnswer(params: { sessionId: string; topic: Topic; messageId: string; isCorrect: boolean }): Promise<void>
  updateSession(sessionId: string, updates: { title?: string; topic?: Topic; mode?: ChatMode }): Promise<void>
  deleteSession(sessionId: string): Promise<void>
  getInitialActiveSessionId(): Promise<string | null>
  persistActiveSessionId(sessionId: string | null): Promise<void>
}
