import { buildGroundingSystemMessage, retrieveKnowledgeContext } from './knowledge-shared'

type ApiRequest = {
  method?: string
  body?: unknown
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  send: (body: string) => void
}

type CaseRequestBody = {
  condition?: string
  complexity?: 'basic' | 'intermediate' | 'advanced'
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' })
      return
    }

    const body = (req.body ?? {}) as CaseRequestBody
    const condition = (body.condition ?? '').trim() || 'acute respiratory distress'
    const complexity = body.complexity ?? 'intermediate'
    let groundingPrompt = 'If sources are insufficient, clearly state uncertainty and keep guidance general.'

    try {
      const matches = await retrieveKnowledgeContext({
        query: `${condition} nursing assessment priorities interventions escalation criteria`,
        topic: 'medsurg',
        matchCount: 5,
      })
      groundingPrompt = buildGroundingSystemMessage(matches)
    } catch {
      // Retrieval remains best-effort for case generation.
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'case_scenario',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'chartSummary', 'vitals', 'assistantPrompt', 'debriefPoints'],
              properties: {
                title: { type: 'string' },
                chartSummary: { type: 'array', items: { type: 'string' } },
                vitals: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['bp', 'hr', 'rr', 'temp', 'spo2', 'pain'],
                  properties: {
                    bp: { type: 'string' },
                    hr: { type: 'string' },
                    rr: { type: 'string' },
                    temp: { type: 'string' },
                    spo2: { type: 'string' },
                    pain: { type: 'string' },
                  },
                },
                assistantPrompt: { type: 'string' },
                debriefPoints: { type: 'array', items: { type: 'string' } },
                sourceCitations: { type: 'array', items: { type: 'string' } },
                safetyNotice: { type: 'string' },
              },
            },
          },
        },
        messages: [
          {
            role: 'system',
            content:
              'You are an NCLEX case-study generator. Create safe, educational, realistic scenarios for nursing students. Avoid giving prescriptive medical orders; frame nursing priorities and escalation guidance.',
          },
          {
            role: 'system',
            content: groundingPrompt,
          },
          {
            role: 'user',
            content: `Generate a ${complexity} patient case scenario for condition: ${condition}.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      res.status(response.status).json({ error: text || 'Case generation failed' })
      return
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      res.status(502).json({ error: 'Empty case generation output' })
      return
    }
    try {
      const parsed = JSON.parse(content) as unknown
      res.status(200).json({ scenario: parsed })
      return
    } catch {
      res.status(502).json({ error: 'Failed to parse case generation output' })
      return
    }
  } catch (error) {
    console.error('Case API error', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Case generation failed' })
  }
}
