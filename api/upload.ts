import { extractFileText, parseBase64Upload, type UploadRequestBody } from './upload-shared'

type ApiRequest = {
  method?: string
  body?: unknown
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

  try {
    const body = (req.body ?? {}) as UploadRequestBody
    const parsed = parseBase64Upload(body)
    const text = await extractFileText(parsed)

    res.status(200).json({
      text,
      totalChars: text.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process upload'
    res.status(400).json({ error: message })
  }
}
