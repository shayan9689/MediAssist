import { PDFParse } from 'pdf-parse'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export type UploadRequestBody = {
  fileName?: string
  mimeType?: string
  base64Data?: string
}

export function parseBase64Upload(body: UploadRequestBody): {
  fileName: string
  mimeType: string
  bytes: Buffer
} {
  const fileName = (body.fileName ?? '').trim()
  const mimeType = (body.mimeType ?? '').trim().toLowerCase()
  const base64Data = (body.base64Data ?? '').trim()

  if (!fileName || !mimeType || !base64Data) {
    throw new Error('fileName, mimeType and base64Data are required.')
  }

  const bytes = Buffer.from(base64Data, 'base64')
  if (bytes.length === 0) {
    throw new Error('Uploaded file is empty.')
  }

  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error('File exceeds 20 MB limit.')
  }

  return { fileName, mimeType, bytes }
}

export async function extractFileText(params: {
  fileName: string
  mimeType: string
  bytes: Buffer
}): Promise<string> {
  const lowerName = params.fileName.toLowerCase()
  const isPdf =
    params.mimeType === 'application/pdf' ||
    params.mimeType === 'application/x-pdf' ||
    lowerName.endsWith('.pdf')

  if (isPdf) {
    const parser = new PDFParse({ data: params.bytes })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text?.trim() ?? ''
    if (!text) throw new Error('Could not extract text from this PDF.')
    return text
  }

  const isPlainText = params.mimeType.startsWith('text/') || lowerName.endsWith('.txt')
  if (isPlainText) {
    const text = params.bytes.toString('utf8').trim()
    if (!text) throw new Error('Uploaded text file is empty.')
    return text
  }

  throw new Error('Unsupported file type. Please upload PDF or text files only.')
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
}

export default function handler(_req: unknown, res: ApiResponse) {
  res.status(404).json({ error: 'Not found' })
}
