import type { ChatMode } from '@/shared/types/chat'

export const CHAT_MODES: ReadonlyArray<{ value: ChatMode; label: string }> = [
  { value: 'tutor', label: 'Tutor' },
  { value: 'explainer', label: 'Topic Explainer' },
  { value: 'drill', label: 'MCQ Practice' },
]

export const DEFAULT_CHAT_MODE: ChatMode = 'tutor'
