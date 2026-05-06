import { createClient } from '@supabase/supabase-js'
import type { UploadRequestBody } from './upload-shared'
import { extractFileText, parseBase64Upload } from './upload-shared'

type Topic = 'anatomy' | 'pharm' | 'medsurg' | 'nutrition' | 'psych'

type KnowledgeChunkMatch = {
  chunk_id: string
  document_id: string
  source_name: string
  source_url: string | null
  authority: string
  topic: Topic | null
  content: string
  similarity: number
}

export type KnowledgeIngestRequestBody = UploadRequestBody & {
  sourceName?: string
  sourceUrl?: string
  authority?: string
  topic?: Topic
  publishedAt?: string
  trustTier?: number
}

function getSupabaseAdminClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin envs (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function splitIntoChunks(text: string, chunkSize = 1200, overlap = 180): string[] {
  const normalized = text.replace(/\r/g, '').trim()
  if (!normalized) return []

  const chunks: string[] = []
  let start = 0
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length)
    const chunk = normalized.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= normalized.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return chunks
}

async function createEmbeddings(input: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY on server')

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Embedding request failed')
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>
  }
  return data.data.map((row) => row.embedding)
}

export async function ingestKnowledgeDocument(body: KnowledgeIngestRequestBody): Promise<{
  documentId: string
  chunkCount: number
}> {
  const sourceName = (body.sourceName ?? body.fileName ?? '').trim()
  const authority = (body.authority ?? '').trim()
  if (!sourceName || !authority) {
    throw new Error('sourceName and authority are required.')
  }

  const parsedUpload = parseBase64Upload(body)
  const text = await extractFileText({
    ...parsedUpload,
    openAiApiKey: process.env.OPENAI_API_KEY,
  })
  const chunks = splitIntoChunks(text)
  if (chunks.length === 0) {
    throw new Error('No chunkable text found in document.')
  }

  const embeddings = await createEmbeddings(chunks)
  if (embeddings.length !== chunks.length) {
    throw new Error('Embedding count mismatch.')
  }

  const admin = getSupabaseAdminClient()
  const { data: docInsert, error: docError } = await admin
    .from('knowledge_documents')
    .insert({
      source_name: sourceName,
      source_url: body.sourceUrl ?? null,
      authority,
      topic: body.topic ?? null,
      published_at: body.publishedAt ?? null,
      trust_tier: typeof body.trustTier === 'number' ? body.trustTier : 1,
    })
    .select('id')
    .single()

  if (docError || !docInsert?.id) {
    throw new Error(docError?.message || 'Failed to insert knowledge document')
  }

  const rows = chunks.map((chunk, index) => ({
    document_id: docInsert.id,
    chunk_index: index,
    topic: body.topic ?? null,
    content: chunk,
    metadata: { sourceName, authority, sourceUrl: body.sourceUrl ?? null },
    embedding: embeddings[index],
  }))

  const { error: chunkError } = await admin.from('knowledge_chunks').insert(rows)
  if (chunkError) {
    throw new Error(chunkError.message || 'Failed to insert knowledge chunks')
  }

  return { documentId: docInsert.id, chunkCount: rows.length }
}

export async function retrieveKnowledgeContext(params: {
  query: string
  topic?: Topic | string
  matchCount?: number
}): Promise<KnowledgeChunkMatch[]> {
  const query = params.query.trim()
  if (!query) return []

  const [queryEmbedding] = await createEmbeddings([query])
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_count: params.matchCount ?? 5,
    filter_topic: params.topic ?? null,
  })

  if (error) {
    throw new Error(error.message || 'Knowledge retrieval failed')
  }

  return (data ?? []) as KnowledgeChunkMatch[]
}

export function buildGroundingSystemMessage(matches: KnowledgeChunkMatch[]): string {
  if (matches.length === 0) {
    return [
      'No trusted knowledge chunks were retrieved for this question.',
      'Respond cautiously, mention uncertainty, and recommend consulting authoritative nursing references.',
    ].join(' ')
  }

  const citations = matches
    .map((item, index) => {
      const urlPart = item.source_url ? ` (${item.source_url})` : ''
      return [
        `Source ${index + 1}: ${item.source_name} | Authority: ${item.authority}${urlPart}`,
        `Excerpt: ${item.content}`,
      ].join('\n')
    })
    .join('\n\n')

  return [
    'You must answer using ONLY the trusted source excerpts below.',
    'If sources are insufficient, explicitly say so.',
    'For each major claim, cite like [Source 1], [Source 2].',
    '',
    citations,
  ].join('\n')
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
}

export default function handler(_req: unknown, res: ApiResponse) {
  res.status(404).json({ error: 'Not found' })
}
