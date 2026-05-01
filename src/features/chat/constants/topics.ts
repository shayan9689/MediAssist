import type { Topic } from '@/shared/types/chat'

export const TOPICS: ReadonlyArray<{ value: Topic; label: string }> = [
  { value: 'anatomy', label: 'Anatomy & Physiology' },
  { value: 'pharm', label: 'Pharmacology' },
  { value: 'medsurg', label: 'Medical-Surgical' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'psych', label: 'Psychology & Sociology' },
]

export const DEFAULT_TOPIC: Topic = 'anatomy'
