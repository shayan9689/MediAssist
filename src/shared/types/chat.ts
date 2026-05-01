export type Topic = 'anatomy' | 'pharm' | 'medsurg' | 'nutrition' | 'psych'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export type ChatSession = {
  id: string
  title: string
  topic: Topic
  createdAt: string
  messages: ChatMessage[]
}
