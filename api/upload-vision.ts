import { getDocumentProxy, renderPageAsImage } from 'unpdf'

const VISION_MAX_PAGES = 10
const VISION_PAGE_WIDTH = 900
const VISION_MODEL = 'gpt-4o-mini'

/**
 * Rasterize PDF pages and ask the model to transcribe visible content (scanned / image-heavy PDFs).
 */
export async function pdfPlainTextViaOpenAiVision(
  bytes: Buffer,
  apiKey: string,
  fileName: string,
): Promise<string> {
  const data = new Uint8Array(bytes)
  const pdf = await getDocumentProxy(data)
  try {
    const total = pdf.numPages
    const n = Math.min(total, VISION_MAX_PAGES)
    const canvasImport = () => import('@napi-rs/canvas')

    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail: 'low' } }
    > = [
      {
        type: 'text',
        text: [
          `You help nursing students study for the NCLEX. File name: "${fileName}".`,
          `You will see ${n} page image(s) from a PDF (${total} page(s) total).`,
          'Transcribe all readable text in natural reading order. Preserve headings and lists where obvious.',
          'If a region is unreadable, skip it. Plain text only (no markdown).',
          'Be thorough—this transcript feeds automated summaries and quizzes.',
        ].join('\n'),
      },
    ]

    for (let i = 1; i <= n; i++) {
      const dataUrl = (await renderPageAsImage(pdf, i, {
        canvasImport,
        width: VISION_PAGE_WIDTH,
        toDataURL: true,
      })) as string
      content.push({
        type: 'image_url',
        image_url: { url: dataUrl, detail: 'low' },
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.1,
        max_tokens: 8192,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(detail || `Vision transcription failed (${response.status})`)
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const out = payload.choices?.[0]?.message?.content?.trim()
    if (!out) {
      throw new Error('Vision transcription returned empty content.')
    }
    return out
  } finally {
    await pdf.destroy().catch(() => {})
  }
}
