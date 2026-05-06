import { extractText } from 'unpdf'

import { pdfPlainTextViaOpenAiVision } from './upload-vision'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
/** Below this many non-whitespace characters, we try OpenAI vision (when API key is set). */
const MIN_PDF_SUBSTANTIVE_CHARS = 55

export type UploadRequestBody = {
  fileName?: string
  mimeType?: string
  base64Data?: string
}

export function isPdfMagic(bytes: Buffer): boolean {
  return bytes.length >= 5 && bytes.subarray(0, 5).toString('latin1').startsWith('%PDF')
}

function inferMimeType(fileName: string, bytes: Buffer): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf') || isPdfMagic(bytes)) return 'application/pdf'
  if (lower.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

function mimeLooksLikePdf(mime: string): boolean {
  return (
    mime === 'application/pdf' ||
    mime === 'application/x-pdf' ||
    mime.endsWith('+pdf') ||
    mime === 'application/acrobat'
  )
}

export function parseBase64Upload(body: UploadRequestBody): {
  fileName: string
  mimeType: string
  bytes: Buffer
} {
  const fileName = (body.fileName ?? '').trim()
  const base64Data = (body.base64Data ?? '').trim()

  if (!fileName || !base64Data) {
    throw new Error('fileName and base64Data are required.')
  }

  const bytes = Buffer.from(base64Data, 'base64')
  if (bytes.length === 0) {
    throw new Error('Uploaded file is empty.')
  }

  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error('File exceeds 20 MB limit.')
  }

  let mimeType = (body.mimeType ?? '').trim().toLowerCase()
  if (
    !mimeType ||
    mimeType === 'application/octet-stream' ||
    mimeType === 'binary/octet-stream' ||
    mimeType === 'application/x-download'
  ) {
    mimeType = inferMimeType(fileName, bytes)
  }

  return { fileName, mimeType, bytes }
}

export type ExtractFileTextParams = {
  fileName: string
  mimeType: string
  bytes: Buffer
  /** Used to transcribe scanned PDFs when normal text extraction is weak or fails. */
  openAiApiKey?: string
}

export async function extractFileText(params: ExtractFileTextParams): Promise<string> {
  const lowerName = params.fileName.toLowerCase()
  const mime = params.mimeType

  const isPdf =
    lowerName.endsWith('.pdf') ||
    isPdfMagic(params.bytes) ||
    mimeLooksLikePdf(mime)

  if (isPdf) {
    return extractPdfWithOptionalVision(params)
  }

  const isPlainText =
    mime.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    (mime === 'application/octet-stream' && lowerName.endsWith('.txt'))

  if (isPlainText) {
    const text = params.bytes.toString('utf8').trim()
    if (!text) throw new Error('Uploaded text file is empty.')
    return text
  }

  throw new Error('Unsupported file type. Please upload a PDF or text file.')
}

async function extractPdfWithOptionalVision(params: ExtractFileTextParams): Promise<string> {
  const key = params.openAiApiKey?.trim()
  let text = ''
  let parseFailed = false

  try {
    const { text: raw } = await extractText(new Uint8Array(params.bytes), { mergePages: true })
    text = (raw ?? '').trim()
  } catch {
    parseFailed = true
  }

  const substantive = text.replace(/\s/g, '').length
  const needsVision = Boolean(key) && (parseFailed || substantive < MIN_PDF_SUBSTANTIVE_CHARS)

  if (needsVision && key) {
    try {
      const visionText = (await pdfPlainTextViaOpenAiVision(params.bytes, key, params.fileName)).trim()
      if (visionText.length >= 40) {
        return visionText
      }
      if (!parseFailed && text.length > 0) {
        return text
      }
    } catch (visionErr) {
      if (!parseFailed && text.length > 0) {
        return text
      }
      const msg = visionErr instanceof Error ? visionErr.message : 'Vision transcription failed.'
      throw new Error(
        parseFailed
          ? `Could not read this PDF (${msg}). It may be encrypted, corrupted, or unsupported.`
          : msg,
        { cause: visionErr },
      )
    }
  }

  if (!text) {
    if (key) {
      throw new Error(
        'Could not extract enough text from this PDF. Try a smaller file or a text-based (not only scanned) PDF.',
      )
    }
    throw new Error(
      'Could not extract text from this PDF. Scanned documents need an OpenAI key on the server for transcription.',
    )
  }

  return text
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
}

export default function handler(_req: unknown, res: ApiResponse) {
  res.status(404).json({ error: 'Not found' })
}
