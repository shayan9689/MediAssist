import { createClient } from '@supabase/supabase-js'
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

type DrugRequestBody = {
  name?: string
}

type DrugCard = {
  drugName: string
  drugClass: string
  mechanism: string
  indications: string[]
  contraindications: string[]
  sideEffects: string[]
  nursingNotes: string[]
  nclexPriority: string
  sourceCitations?: string[]
  safetyNotice?: string
}

function getSupabaseAdmin() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !serviceRole) return null
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function generateDrugCard(apiKey: string, name: string, groundingPrompt: string): Promise<DrugCard> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
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
            required: [
              'drugName',
              'drugClass',
              'mechanism',
              'indications',
              'contraindications',
              'sideEffects',
              'nursingNotes',
              'nclexPriority',
            ],
            properties: {
              drugName: { type: 'string' },
              drugClass: { type: 'string' },
              mechanism: { type: 'string' },
              indications: { type: 'array', items: { type: 'string' } },
              contraindications: { type: 'array', items: { type: 'string' } },
              sideEffects: { type: 'array', items: { type: 'string' } },
              nursingNotes: { type: 'array', items: { type: 'string' } },
              nclexPriority: { type: 'string' },
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
            'You are a nursing pharmacology tutor. Return concise factual educational content. If uncertain, say uncertain. Do not provide diagnosis or prescribing instructions. Always include a short safetyNotice and sourceCitations.',
        },
        {
          role: 'system',
          content: groundingPrompt,
        },
        {
          role: 'user',
          content: `Create a nursing medication card for: ${name}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to generate drug card')
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty drug response')
  return JSON.parse(content) as DrugCard
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const body = (req.body ?? {}) as DrugRequestBody
    const name = (body.name ?? '').trim()
    if (!name) {
      res.status(400).json({ error: 'Drug name is required' })
      return
    }

    const admin = getSupabaseAdmin()
    const normalized = name.toLowerCase()

    if (admin) {
      const { data: cached, error } = await admin
        .from('drug_cache')
        .select('drug_name,drug_class,mechanism,side_effects,nursing_notes')
        .eq('drug_name', normalized)
        .maybeSingle()
      if (!error && cached) {
        res.status(200).json({
          card: {
            drugName: cached.drug_name,
            drugClass: cached.drug_class || '',
            mechanism: cached.mechanism || '',
            indications: [],
            contraindications: [],
            sideEffects: Array.isArray(cached.side_effects) ? cached.side_effects : [],
            nursingNotes: cached.nursing_notes ? cached.nursing_notes.split(' | ').filter(Boolean) : [],
            nclexPriority: 'Use this summary for study only and verify with your institutional drug guide.',
            sourceCitations: ['Local cache (no inline source URLs).'],
            safetyNotice:
              'Educational use only. Follow institutional policy, provider orders, and official references before administration.',
          } satisfies DrugCard,
          source: 'cache',
        })
        return
      }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' })
      return
    }
    let groundingPrompt = 'If source context is missing, explicitly state limitations.'
    try {
      const matches = await retrieveKnowledgeContext({
        query: `${name} medication class indications contraindications side effects nursing implications`,
        topic: 'pharm',
        matchCount: 4,
      })
      groundingPrompt = buildGroundingSystemMessage(matches)
    } catch {
      // Retrieval is best-effort for drug cards.
    }
    const card = await generateDrugCard(apiKey, name, groundingPrompt)

    if (admin) {
      await admin.from('drug_cache').upsert({
        drug_name: normalized,
        drug_class: card.drugClass,
        mechanism: card.mechanism,
        side_effects: card.sideEffects,
        nursing_notes: card.nursingNotes.join(' | '),
        updated_at: new Date().toISOString(),
      })
    }

    res.status(200).json({ card, source: 'model' })
  } catch (error) {
    console.error('Drug API error', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Drug lookup failed' })
  }
}
