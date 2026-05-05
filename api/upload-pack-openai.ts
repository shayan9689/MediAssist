export type UploadPackIntent = 'summary_quiz' | 'summary_only' | 'quiz_only' | 'custom_focus'

export function parseUploadIntent(raw: unknown): UploadPackIntent {
  if (raw === 'summary_only' || raw === 'quiz_only' || raw === 'custom_focus') return raw
  return 'summary_quiz'
}

type QuizItemSchema = {
  type: 'object'
  additionalProperties: false
  required: string[]
  properties: Record<string, unknown>
}

export function buildRelaxedUploadPackSchema(): {
  type: 'object'
  additionalProperties: false
  required: string[]
  properties: {
    summary: { type: 'array'; minItems: number; maxItems: number; items: { type: 'string' } }
    quiz: { type: 'array'; minItems: number; maxItems: number; items: QuizItemSchema }
  }
} {
  const quizItem: QuizItemSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['question', 'options', 'correctIndex', 'rationale'],
    properties: {
      question: { type: 'string' },
      options: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: { type: 'string' },
      },
      correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
      rationale: { type: 'string' },
    },
  }

  return {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'quiz'],
    properties: {
      summary: { type: 'array', minItems: 0, maxItems: 8, items: { type: 'string' } },
      quiz: { type: 'array', minItems: 0, maxItems: 5, items: quizItem },
    },
  }
}

export function buildUploadPackSystemPrompt(baseSystemPrompt: string, intent: UploadPackIntent): string {
  const base = baseSystemPrompt.trim() || 'You are NurseAI, an NCLEX preparation tutor.'
  switch (intent) {
    case 'summary_only':
      return `${base} Return JSON only. Intent: SUMMARY ONLY. Produce 5-8 concise nursing-focused summary bullets from the uploaded document. The quiz array MUST be empty [].`
    case 'quiz_only':
      return `${base} Return JSON only. Intent: QUIZ ONLY. Produce exactly 5 NCLEX-style multiple-choice questions from the document. The summary array MUST be empty [].`
    case 'custom_focus':
      return `${base} Return JSON only. Intent: CUSTOM FOCUS. The user listed specific priorities—address those first in the summary and in the quiz. Still return 5-8 summary bullets AND exactly 5 quiz questions grounded in the document.`
    default:
      return `${base} Return JSON only. Intent: SUMMARY AND QUIZ. Produce 5-8 concise summary bullets AND exactly 5 NCLEX-style MCQs from the document.`
  }
}

type LoosePack = { summary?: unknown; quiz?: unknown }

export function normalizeUploadPackPayload(parsed: unknown): { summary: string[]; quiz: LoosePack['quiz'] } | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as LoosePack
  if (!Array.isArray(p.summary) || !Array.isArray(p.quiz)) return null
  const summary = p.summary.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  const quiz = p.quiz
  return { summary, quiz }
}

export function validateUploadPackForIntent(
  summaryLen: number,
  quizLen: number,
  intent: UploadPackIntent,
): string | null {
  if (intent === 'summary_only') {
    if (summaryLen < 3) return 'Upload pack: summary too short'
    if (quizLen !== 0) return 'Upload pack: expected no quiz items for summary-only'
    return null
  }
  if (intent === 'quiz_only') {
    if (quizLen < 3) return 'Upload pack: quiz too short'
    if (summaryLen !== 0) return 'Upload pack: expected no summary bullets for quiz-only'
    return null
  }
  if (summaryLen < 3 || quizLen < 3) return 'Upload pack: need both summary and quiz content'
  return null
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
}

export default function handler(_req: unknown, res: ApiResponse) {
  res.status(404).json({ error: 'Not found' })
}
