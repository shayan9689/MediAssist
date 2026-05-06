import process from 'node:process'
type ApiRequest = {
  method?: string
  body?: unknown
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  send: (body: string) => void
}

type QuizRequestBody = {
  topic?: string
  difficulty?: 'novice' | 'intermediate' | 'expert'
  count?: number
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' })
    return
  }

  const body = (req.body ?? {}) as QuizRequestBody
  const topic = (body.topic ?? 'NCLEX fundamentals').trim()
  const difficulty = body.difficulty ?? 'intermediate'
  const count = Math.max(3, Math.min(10, body.count ?? 5))

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.35,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'quiz_set',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'questions'],
              properties: {
                title: { type: 'string' },
                questions: {
                  type: 'array',
                  minItems: 3,
                  maxItems: 10,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'stem', 'options', 'correctIndex', 'rationale'],
                    properties: {
                      id: { type: 'string' },
                      stem: { type: 'string' },
                      options: {
                        type: 'array',
                        minItems: 4,
                        maxItems: 5,
                        items: { type: 'string' },
                      },
                      correctIndex: { type: 'integer', minimum: 0, maximum: 4 },
                      rationale: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        messages: [
          {
            role: 'system',
            content:
              'You are an NCLEX question generator. Output accurate educational MCQs with clear rationales.',
          },
          {
            role: 'user',
            content: `Generate ${count} ${difficulty} NCLEX-style questions on topic: ${topic}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      res.status(response.status).json({ error: text || 'Quiz generation failed' })
      return
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      res.status(502).json({ error: 'Empty quiz output' })
      return
    }
    res.status(200).json({ quiz: JSON.parse(content) })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Quiz generation failed' })
  }
}
