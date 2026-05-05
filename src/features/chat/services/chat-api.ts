import type { ChatMessage, ChatMode, Topic } from '@/shared/types/chat'
export const MCQ_MESSAGE_PREFIX = 'MCQ_JSON::'
export const UPLOAD_PACK_PREFIX = 'UPLOAD_PACK_JSON::'

export const WELCOME_UPLOAD_HINT_PREFIX = 'WELCOME_UPLOAD_HINT::'

export type UploadPackIntent = 'summary_quiz' | 'summary_only' | 'quiz_only' | 'custom_focus'

export type DrillMcq = {
  question: string
  options: string[]
  correctIndex: number
  rationales: string[]
}

export type UploadQuizItem = {
  question: string
  options: string[]
  correctIndex: number
  rationale: string
}

export type UploadStudyPack = {
  summary: string[]
  quiz: UploadQuizItem[]
}

const TOPIC_BASE_PROMPTS: Record<Topic, string> = {
  anatomy:
    'Focus on anatomy and physiology.',
  pharm:
    'Focus on pharmacology safety, mechanisms, side effects, contraindications, and nursing considerations.',
  medsurg:
    'Focus on medical-surgical nursing priorities, assessment, interventions, and escalation cues.',
  nutrition:
    'Focus on nutrition principles for nursing care and NCLEX-style prioritization.',
  psych:
    'Focus on psychosocial nursing care, therapeutic communication, and patient safety.',
}

const MODE_PROMPTS: Record<ChatMode, string> = {
  tutor:
    'You are NurseAI, an NCLEX tutor. Keep responses concise, practical, and safety-first. Use bullet points when helpful.',
  explainer:
    'You are NurseAI in Topic Explainer mode. Always format the response in this exact structure:\n1) Definition\n2) Mechanism\n3) Clinical Relevance\n4) NCLEX Exam Tip\nKeep wording simple and exam-focused.',
  drill:
    'You are NurseAI in NCLEX Drill mode. Ask 1 NCLEX-style question at a time, wait for student response, then provide rationale and next question.',
}

type BuildSystemPromptOptions = {
  /** When true, JSON/title fields must stay clean; conversational emoji rules are relaxed only where allowed by schema. */
  structuredJson?: boolean
}

function buildSystemPrompt(
  topic: Topic,
  mode: ChatMode,
  learnerName?: string | null,
  options?: BuildSystemPromptOptions,
): string {
  const structuredJson = Boolean(options?.structuredJson)
  const nameGuidance =
    learnerName && learnerName.trim()
      ? [
          `Learner name: ${learnerName.trim()}.`,
          "Use the learner's name naturally in greetings/encouragement where appropriate, but do not force it in every line.",
          'Keep tone warm, respectful, and supportive (like a caring tutor).',
        ].join(' ')
      : 'Keep tone warm, respectful, and supportive (like a caring tutor).'
  const emojiGuidance = structuredJson
    ? 'Structured JSON mode: follow the schema exactly. Chat titles must be plain text with no emoji. MCQ option strings must be plain clinical text with no emoji or decorative symbols. In upload-pack summaries and rationales you may use at most one tasteful emoji per bullet when it helps scanning—never in quiz option text.'
    : 'You may use a few tasteful emoji very sparingly (about 0–2 per reply) where they add warmth or clarity—never spam. Skip emoji in dense numbered lists or raw data if they hurt readability.'
  return [
    MODE_PROMPTS[mode],
    TOPIC_BASE_PROMPTS[topic],
    nameGuidance,
    emojiGuidance,
    `Topic guard: the selected study topic is "${topic}".`,
    'If the user asks something clearly outside this selected topic, briefly flag the mismatch in 1 short line and suggest switching topic.',
    'Then still provide a concise helpful answer (do not refuse), with exam-safe wording.',
  ].join(' ')
}

function toApiMessage(message: ChatMessage) {
  const content = message.content.startsWith(MCQ_MESSAGE_PREFIX)
    ? (() => {
        try {
          const parsed = JSON.parse(message.content.slice(MCQ_MESSAGE_PREFIX.length)) as DrillMcq
          const options = parsed.options
            .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
            .join('\n')
          return `MCQ asked:\n${parsed.question}\n${options}`
        } catch {
          return message.content
        }
      })()
    : message.content

  return {
    role: message.role,
    content,
  }
}

function mapChatError(status: number, raw: string): string {
  if (status === 401) return 'OpenAI authentication failed. Check your OPENAI_API_KEY.'
  if (status === 429) return 'Rate limit or quota reached. Please retry in a moment.'
  if (status >= 500) return 'AI server is temporarily unavailable. Please try again.'
  if (!raw) return 'Failed to get assistant response.'
  return raw
}

type StreamOptions = {
  onChunk: (chunk: string) => void
  signal?: AbortSignal
}

export async function streamAssistantReply(
  topic: Topic,
  mode: ChatMode,
  messages: ChatMessage[],
  learnerName: string | null,
  options: StreamOptions,
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      mode,
      systemPrompt: buildSystemPrompt(topic, mode, learnerName),
      messages: messages.map(toApiMessage),
    }),
  })

  if (!response.ok) {
    const rawError = await (async () => {
      try {
        const maybeJson = (await response.json()) as { error?: string }
        return maybeJson.error ?? ''
      } catch {
        return await response.text()
      }
    })()
    throw new Error(mapChatError(response.status, rawError))
  }

  const stream = response.body
  if (!stream) {
    throw new Error('Assistant stream is unavailable.')
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let reply = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (!chunk) continue
    reply += chunk
    options.onChunk(chunk)
  }

  reply = reply.trim()
  if (!reply) throw new Error('Assistant returned an empty response')

  return reply
}

export async function requestDrillMcq(
  topic: Topic,
  mode: ChatMode,
  messages: ChatMessage[],
  learnerName: string | null,
): Promise<DrillMcq> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      mode,
      responseFormat: 'mcq_json',
      systemPrompt: buildSystemPrompt(topic, mode, learnerName, { structuredJson: true }),
      messages: messages.map(toApiMessage),
    }),
  })

  if (!response.ok) {
    const rawError = await (async () => {
      try {
        const maybeJson = (await response.json()) as { error?: string }
        return maybeJson.error ?? ''
      } catch {
        return await response.text()
      }
    })()
    throw new Error(mapChatError(response.status, rawError))
  }

  const data = (await response.json()) as { mcq?: DrillMcq }
  const mcq = data.mcq
  if (!mcq || !mcq.question || !Array.isArray(mcq.options) || !Array.isArray(mcq.rationales)) {
    throw new Error('Invalid MCQ response from assistant.')
  }
  return mcq
}

export async function requestSessionTitle(
  topic: Topic,
  mode: ChatMode,
  messages: ChatMessage[],
  learnerName: string | null,
): Promise<string | null> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      mode,
      responseFormat: 'title_json',
      systemPrompt: buildSystemPrompt(topic, mode, learnerName, { structuredJson: true }),
      messages: messages.map(toApiMessage),
    }),
  })

  if (!response.ok) return null
  const data = (await response.json()) as { title?: unknown }
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  return title ? title.slice(0, 80) : null
}

type UploadExtractionResponse = {
  text: string
  totalChars: number
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read selected file.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const base64 = result.includes(',') ? result.split(',')[1] : ''
      if (!base64) {
        reject(new Error('Failed to convert file to base64 data.'))
        return
      }
      resolve(base64)
    }
    reader.readAsDataURL(file)
  })
}

export async function extractUploadText(file: File): Promise<UploadExtractionResponse> {
  const base64Data = await toBase64(file)
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64Data,
    }),
  })

  if (!response.ok) {
    const rawError = await (async () => {
      try {
        const maybeJson = (await response.json()) as { error?: string }
        return maybeJson.error ?? ''
      } catch {
        return await response.text()
      }
    })()
    throw new Error(rawError || 'Failed to process uploaded file')
  }

  const data = (await response.json()) as UploadExtractionResponse
  if (!data.text?.trim()) {
    throw new Error('No extractable text found in uploaded file.')
  }
  return data
}

export async function requestUploadStudyPack(params: {
  topic: Topic
  sourceText: string
  sourceName: string
  intent: UploadPackIntent
  focusNotes?: string
  learnerName?: string | null
}): Promise<UploadStudyPack> {
  const trimmed = params.sourceText.trim()
  const clipped = trimmed.length > 12000 ? `${trimmed.slice(0, 12000)}\n\n[Truncated for length]` : trimmed

  const intentLine =
    params.intent === 'summary_only'
      ? 'Learner chose: SUMMARY ONLY from this document.'
      : params.intent === 'quiz_only'
        ? 'Learner chose: QUIZ ONLY (five NCLEX MCQs) from this document.'
        : params.intent === 'custom_focus'
          ? 'Learner chose: SUMMARY AND QUIZ with extra focus notes below.'
          : 'Learner chose: SUMMARY AND QUIZ from this document.'

  const parts = [`Source file: ${params.sourceName}`, intentLine]
  if (params.intent === 'custom_focus' && params.focusNotes?.trim()) {
    parts.push('Focus / specific questions from learner:', params.focusNotes.trim())
  }
  parts.push('Source text:', clipped)

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: params.topic,
      mode: 'tutor',
      responseFormat: 'upload_pack_json',
      uploadIntent: params.intent,
      systemPrompt: buildSystemPrompt(params.topic, 'tutor', params.learnerName, { structuredJson: true }),
      messages: [
        {
          role: 'user',
          content: parts.join('\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    const rawError = await (async () => {
      try {
        const maybeJson = (await response.json()) as { error?: string }
        return maybeJson.error ?? ''
      } catch {
        return await response.text()
      }
    })()
    throw new Error(rawError || 'Failed to generate study pack from upload')
  }

  const data = (await response.json()) as { pack?: UploadStudyPack }
  const pack = data.pack
  if (!pack || !Array.isArray(pack.summary) || !Array.isArray(pack.quiz)) {
    throw new Error('Invalid upload study pack response.')
  }
  if (pack.summary.length === 0 && pack.quiz.length === 0) {
    throw new Error('Upload pack was empty.')
  }
  return pack
}
