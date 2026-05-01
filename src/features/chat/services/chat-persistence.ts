import type { ChatMessage, ChatSession, Topic } from '@/shared/types/chat'

export type ChatPersistence = {
  fetchSessions(): Promise<ChatSession[]>
  createSession(topic: Topic): Promise<ChatSession>
  saveMessage(sessionId: string, message: ChatMessage): Promise<void>
  deleteSession(sessionId: string): Promise<void>
  getInitialActiveSessionId(): Promise<string | null>
  persistActiveSessionId(sessionId: string | null): Promise<void>
}
