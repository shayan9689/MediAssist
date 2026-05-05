import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extractFileText, parseBase64Upload, type UploadRequestBody } from './api/upload-shared'
import {
  buildGroundingSystemMessage,
  ingestKnowledgeDocument,
  retrieveKnowledgeContext,
  type KnowledgeIngestRequestBody,
} from './api/knowledge-shared'
import {
  buildRelaxedUploadPackSchema,
  buildUploadPackSystemPrompt,
  normalizeUploadPackPayload,
  parseUploadIntent,
  validateUploadPackForIntent,
  type UploadPackIntent,
} from './api/upload-pack-openai'

type DevChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type DevChatRequestBody = {
  topic?: string
  mode?: string
  responseFormat?: 'text_stream' | 'mcq_json' | 'upload_pack_json' | 'title_json'
  systemPrompt?: string
  messages?: DevChatMessage[]
  uploadIntent?: string
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), '')
  const openAiApiKey = loadedEnv.OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()

  return {
  plugins: [
    react(),
    {
      name: 'dev-chat-api',
      configureServer(server) {
        server.middlewares.use('/api/chat', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') return

          const apiKey = openAiApiKey
          if (!apiKey) {
            res.statusCode = 500
            res.end('Missing OPENAI_API_KEY on dev server')
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            const rawBody = Buffer.concat(chunks).toString('utf8')
            const body = (rawBody ? JSON.parse(rawBody) : {}) as DevChatRequestBody
            const systemPrompt =
              typeof body.systemPrompt === 'string' && body.systemPrompt.trim()
                ? body.systemPrompt.trim()
                : 'You are NurseAI, an NCLEX preparation tutor.'
            const messages = Array.isArray(body.messages)
              ? body.messages.filter(
                  (m): m is DevChatMessage =>
                    Boolean(m) &&
                    (m.role === 'user' || m.role === 'assistant') &&
                    typeof m.content === 'string' &&
                    m.content.trim().length > 0,
                )
              : []

            if (messages.length === 0) {
              res.statusCode = 400
              res.end('messages must include at least one non-empty user/assistant message')
              return
            }

            const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
            let groundingSystemPrompt: string | null = null
            if (
              latestUserMessage &&
              body.responseFormat !== 'mcq_json' &&
              body.responseFormat !== 'upload_pack_json'
            ) {
              try {
                const matches = await retrieveKnowledgeContext({
                  query: latestUserMessage.content,
                  topic: body.topic,
                  matchCount: 5,
                })
                groundingSystemPrompt = buildGroundingSystemMessage(matches)
              } catch (retrievalError) {
                console.error('Knowledge retrieval warning', retrievalError)
              }
            }

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
                    ...messages,
                  ],
                }),
              })

              if (!openAiResponse.ok) {
                const responseText = await openAiResponse.text()
                res.statusCode = openAiResponse.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: responseText || 'OpenAI request failed' }))
                return
              }

              const data = (await openAiResponse.json()) as {
                choices?: Array<{ message?: { content?: string } }>
              }
              const content = data.choices?.[0]?.message?.content
              if (!content) {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'OpenAI returned empty MCQ output' }))
                return
              }

              let mcq: unknown
              try {
                mcq = JSON.parse(content)
              } catch {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Failed to parse MCQ JSON output' }))
                return
              }

              if (isTitle) {
                const titlePayload = mcq as { title?: unknown }
                const title = typeof titlePayload?.title === 'string' ? titlePayload.title.trim() : ''
                if (!title) {
                  res.statusCode = 502
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid title JSON output' }))
                  return
                }
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ title: title.slice(0, 80) }))
                return
              }

              if (isUploadPack) {
                const normalized = normalizeUploadPackPayload(mcq)
                if (!normalized) {
                  res.statusCode = 502
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid upload study pack shape' }))
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
                  res.statusCode = 502
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: validationError }))
                  return
                }
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    pack: {
                      summary: normalized.summary,
                      quiz: quizLen > 0 ? quizArr : [],
                    },
                  }),
                )
                return
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ mcq }))
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
                  { role: 'system', content: systemPrompt },
                  ...(groundingSystemPrompt ? [{ role: 'system', content: groundingSystemPrompt }] : []),
                  ...messages,
                ],
              }),
            })

            if (!openAiResponse.ok) {
              const responseText = await openAiResponse.text()
              res.statusCode = openAiResponse.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: responseText || 'OpenAI request failed' }))
              return
            }

            if (!openAiResponse.body) {
              res.statusCode = 502
              res.end(JSON.stringify({ error: 'OpenAI returned an empty reply' }))
              return
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-transform')

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
            console.error('Dev chat API error', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Server failed to process chat request' }))
          }
        })
        server.middlewares.use('/api/upload', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') return

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            const rawBody = Buffer.concat(chunks).toString('utf8')
            const body = (rawBody ? JSON.parse(rawBody) : {}) as UploadRequestBody
            const parsed = parseBase64Upload(body)
            const text = await extractFileText(parsed)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ text, totalChars: text.length }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to process upload',
              }),
            )
          }
        })
        server.middlewares.use('/api/drug', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') return
          const apiKey = openAiApiKey
          if (!apiKey) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY on dev server' }))
            return
          }
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            const rawBody = Buffer.concat(chunks).toString('utf8')
            const body = (rawBody ? JSON.parse(rawBody) : {}) as { name?: string }
            const name = (body.name ?? '').trim()
            if (!name) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Drug name is required' }))
              return
            }
            const ai = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.2,
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: 'drug_card',
                    schema: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['drugName', 'drugClass', 'mechanism', 'indications', 'contraindications', 'sideEffects', 'nursingNotes', 'nclexPriority'],
                      properties: {
                        drugName: { type: 'string' },
                        drugClass: { type: 'string' },
                        mechanism: { type: 'string' },
                        indications: { type: 'array', items: { type: 'string' } },
                        contraindications: { type: 'array', items: { type: 'string' } },
                        sideEffects: { type: 'array', items: { type: 'string' } },
                        nursingNotes: { type: 'array', items: { type: 'string' } },
                        nclexPriority: { type: 'string' },
                      },
                    },
                  },
                },
                messages: [
                  { role: 'system', content: 'You are a nursing pharmacology tutor.' },
                  { role: 'user', content: `Create a nursing medication card for: ${name}` },
                ],
              }),
            })
            if (!ai.ok) {
              const text = await ai.text()
              res.statusCode = ai.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: text || 'Drug lookup failed' }))
              return
            }
            const data = (await ai.json()) as { choices?: Array<{ message?: { content?: string } }> }
            const content = data.choices?.[0]?.message?.content
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ card: content ? JSON.parse(content) : null, source: 'model' }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Drug lookup failed' }))
          }
        })
        server.middlewares.use('/api/case', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') return
          const apiKey = openAiApiKey
          if (!apiKey) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY on dev server' }))
            return
          }
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            const rawBody = Buffer.concat(chunks).toString('utf8')
            const body = (rawBody ? JSON.parse(rawBody) : {}) as { condition?: string; complexity?: string }
            const condition = (body.condition ?? '').trim() || 'acute respiratory distress'
            const complexity = (body.complexity ?? 'intermediate').trim()
            const ai = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.4,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: 'Create realistic NCLEX case scenarios in JSON.' },
                  { role: 'user', content: `Generate a ${complexity} case for ${condition} with title, chartSummary[], vitals, assistantPrompt, debriefPoints[]` },
                ],
              }),
            })
            if (!ai.ok) {
              const text = await ai.text()
              res.statusCode = ai.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: text || 'Case generation failed' }))
              return
            }
            const data = (await ai.json()) as { choices?: Array<{ message?: { content?: string } }> }
            const content = data.choices?.[0]?.message?.content
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ scenario: content ? JSON.parse(content) : null }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Case generation failed' }))
          }
        })
        server.middlewares.use('/api/quiz', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') return
          const apiKey = openAiApiKey
          if (!apiKey) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY on dev server' }))
            return
          }
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            const rawBody = Buffer.concat(chunks).toString('utf8')
            const body = (rawBody ? JSON.parse(rawBody) : {}) as { topic?: string; difficulty?: string; count?: number }
            const topic = (body.topic ?? 'NCLEX fundamentals').trim()
            const difficulty = (body.difficulty ?? 'intermediate').trim()
            const count = Math.max(3, Math.min(10, body.count ?? 5))
            const ai = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.35,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: 'Generate NCLEX quiz sets in JSON with title and questions[]' },
                  { role: 'user', content: `Generate ${count} ${difficulty} questions on ${topic}. Each question needs id, stem, options[], correctIndex, rationale.` },
                ],
              }),
            })
            if (!ai.ok) {
              const text = await ai.text()
              res.statusCode = ai.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: text || 'Quiz generation failed' }))
              return
            }
            const data = (await ai.json()) as { choices?: Array<{ message?: { content?: string } }> }
            const content = data.choices?.[0]?.message?.content
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ quiz: content ? JSON.parse(content) : null }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Quiz generation failed' }))
          }
        })
        server.middlewares.use('/api/knowledge/ingest', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') return

          const ingestToken = process.env.KNOWLEDGE_INGEST_TOKEN?.trim()
          if (ingestToken) {
            const provided = req.headers['x-ingest-token']
            const normalized = Array.isArray(provided) ? provided[0] : provided
            if (!normalized || normalized !== ingestToken) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Unauthorized ingest token' }))
              return
            }
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            const rawBody = Buffer.concat(chunks).toString('utf8')
            const body = (rawBody ? JSON.parse(rawBody) : {}) as KnowledgeIngestRequestBody
            const result = await ingestKnowledgeDocument(body)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : 'Knowledge ingest failed',
              }),
            )
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  }
})
