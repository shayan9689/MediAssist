import { buildGroundingSystemMessage, retrieveKnowledgeContext } from './knowledge-shared.js'
import {
  buildRelaxedUploadPackSchema,
  buildUploadPackSystemPrompt,
  normalizeUploadPackPayload,
  parseUploadIntent,
  validateUploadPackForIntent,
  type UploadPackIntent,
} from './upload-pack-openai.js'
import process from 'node:process'

type IncomingMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ChatRequestBody = {
  topic?: string
  mode?: string
  responseFormat?: 'text_stream' | 'mcq_json' | 'upload_pack_json' | 'title_json'
  systemPrompt?: string
  messages?: IncomingMessage[]
  uploadIntent?: string
}

type ApiRequest = {
  method?: string
  body?: unknown
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  send: (body: string) => void
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  write: (chunk: string) => void
  end: () => void
}

const FALLBACK_SYSTEM_PROMPT =
  'You are NurseAI, an NCLEX preparation tutor. Explain clearly, prioritize patient safety, and keep guidance educational.'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).send('Missing OPENAI_API_KEY on server')
    return
  }

  const body = (req.body ?? {}) as ChatRequestBody
  const messages = Array.isArray(body.messages) ? body.messages : []
  const safeMessages = messages.filter(
    (m): m is IncomingMessage =>
      Boolean(m) &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0,
  )

  if (safeMessages.length === 0) {
    res.status(400).send('messages must include at least one non-empty user/assistant message')
    return
  }

  const systemPrompt =
    typeof body.systemPrompt === 'string' && body.systemPrompt.trim()
      ? body.systemPrompt.trim()
      : FALLBACK_SYSTEM_PROMPT

  const latestUserMessage = [...safeMessages].reverse().find((message) => message.role === 'user')
  let groundingSystemPrompt: string | null = null

  if (latestUserMessage && body.responseFormat !== 'mcq_json' && body.responseFormat !== 'upload_pack_json') {
    try {
      const matches = await retrieveKnowledgeContext({
        query: latestUserMessage.content,
        topic: body.topic,
        matchCount: 5,
      })
      groundingSystemPrompt = buildGroundingSystemMessage(matches)
    } catch (retrievalError) {
      console.error('Knowledge retrieval warning', retrievalError)
      groundingSystemPrompt = null
    }
  }

  try {
    if (
      body.responseFormat === 'mcq_json' ||
      body.responseFormat === 'upload_pack_json' ||
      body.responseFormat === 'title_json'
    ) {
      const isUploadPack = body.responseFormat === 'upload_pack_json'
      const isTitle = body.responseFormat === 'title_json'
      const uploadIntent: UploadPackIntent = isUploadPack ? parseUploadIntent(body.uploadIntent) : 'summary_quiz'
      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          response_format: isTitle
            ? {
                type: 'json_schema',
                json_schema: {
                  name: 'chat_title',
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['title'],
                    properties: {
                      title: { type: 'string' },
                    },
                  },
                },
              }
            : isUploadPack
            ? {
                type: 'json_schema',
                json_schema: {
                  name: 'upload_study_pack',
                  schema: buildRelaxedUploadPackSchema(),
                },
              }
            : {
                type: 'json_schema',
                json_schema: {
                  name: 'nclex_mcq',
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['question', 'options', 'correctIndex', 'rationales'],
                    properties: {
                      question: { type: 'string' },
                      options: {
                        type: 'array',
                        minItems: 4,
                        maxItems: 5,
                        items: { type: 'string' },
                      },
                      correctIndex: { type: 'integer', minimum: 0, maximum: 4 },
                      rationales: {
                        type: 'array',
                        minItems: 4,
                        maxItems: 5,
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
          messages: [
            {
              role: 'system',
              content: isTitle
                ? `${systemPrompt} Create a short chat title (4-8 words max) summarizing the user's latest intent. No punctuation at the end.`
                : isUploadPack
                ? buildUploadPackSystemPrompt(systemPrompt, uploadIntent)
                : `${systemPrompt} Return exactly one NCLEX-style MCQ as JSON.`,
            },
            ...safeMessages,
          ],
        }),
      })

      if (!openAiResponse.ok) {
        const text = await openAiResponse.text()
        res.status(openAiResponse.status).json({ error: text || 'OpenAI request failed' })
        return
      }

      const data = (await openAiResponse.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = data.choices?.[0]?.message?.content
      if (!content) {
        res.status(502).json({ error: 'OpenAI returned empty MCQ output' })
        return
      }

      let mcq: unknown
      try {
        mcq = JSON.parse(content)
      } catch {
        res.status(502).json({ error: 'Failed to parse MCQ JSON output' })
        return
      }

      if (isTitle) {
        const titlePayload = mcq as { title?: unknown }
        const title = typeof titlePayload?.title === 'string' ? titlePayload.title.trim() : ''
        if (!title) {
          res.status(502).json({ error: 'Invalid title JSON output' })
          return
        }
        res.status(200).json({ title: title.slice(0, 80) })
        return
      }

      if (isUploadPack) {
        const normalized = normalizeUploadPackPayload(mcq)
        if (!normalized) {
          res.status(502).json({ error: 'Invalid upload study pack shape' })
          return
        }
        const quizArr = normalized.quiz as Array<{
          question: string
          options: string[]
          correctIndex: number
          rationale: string
        }>
        const quizLen = Array.isArray(quizArr) ? quizArr.length : 0
        const validationError = validateUploadPackForIntent(normalized.summary.length, quizLen, uploadIntent)
        if (validationError) {
          res.status(502).json({ error: validationError })
          return
        }
        res.status(200).json({
          pack: {
            summary: normalized.summary,
            quiz: quizLen > 0 ? quizArr : [],
          },
        })
        return
      }

      res.status(200).json({ mcq })
      return
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        stream: true,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...(groundingSystemPrompt
            ? [
                {
                  role: 'system' as const,
                  content: groundingSystemPrompt,
                },
              ]
            : []),
          ...safeMessages,
        ],
      }),
    })

    if (!openAiResponse.ok) {
      const text = await openAiResponse.text()
      res.status(openAiResponse.status).json({ error: text || 'OpenAI request failed' })
      return
    }

    if (!openAiResponse.body) {
      res.status(502).json({ error: 'OpenAI stream was unavailable' })
      return
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    const reader = openAiResponse.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const token = parsed.choices?.[0]?.delta?.content
          if (token) {
            res.write(token)
          }
        } catch {
          // Ignore malformed event lines and continue stream processing.
        }
      }
    }

    res.end()
  } catch (error) {
    console.error('Chat API error', error)
    res.status(500).json({ error: 'Server failed to process chat request' })
  }
}
