import process from 'node:process'
import { ingestKnowledgeDocument, type KnowledgeIngestRequestBody } from './knowledge-shared.js'

type ApiRequest = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  send: (body: string) => void
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }

  const ingestToken = process.env.KNOWLEDGE_INGEST_TOKEN?.trim()
  if (ingestToken) {
    const rawHeader = req.headers?.['x-ingest-token']
    const provided = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
    if (!provided || provided !== ingestToken) {
      res.status(401).json({ error: 'Unauthorized ingest token' })
      return
    }
  }

  try {
    const body = (req.body ?? {}) as KnowledgeIngestRequestBody
    const result = await ingestKnowledgeDocument(body)
    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Knowledge ingest failed'
    res.status(400).json({ error: message })
  }
}
