export type Topic = 'anatomy' | 'pharm' | 'medsurg' | 'nutrition' | 'psych'
export type ChatMode = 'tutor' | 'explainer' | 'drill'

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
  mode: ChatMode
  createdAt: string
  messages: ChatMessage[]
}
