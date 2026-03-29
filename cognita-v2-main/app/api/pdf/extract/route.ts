import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { ALLOWED_PDF_TYPES, MAX_PDF_SIZE_BYTES, RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW_MS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`pdf-extract:${user.id}`, RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

    if (!ALLOWED_PDF_TYPES.includes(file.type as typeof ALLOWED_PDF_TYPES[number])) {
      return NextResponse.json({ error: 'Sadece PDF dosyaları kabul edilir' }, { status: 400 })
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json({ error: 'Dosya boyutu 50MB limitini aşıyor' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Use pdfjs-dist in server mode (no worker needed in Node.js)
    const pdfjsLib = (await import('pdfjs-dist')) as Record<string, unknown>
    const pdfjs = pdfjsLib as { GlobalWorkerOptions: { workerSrc: string }; getDocument: (opts: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }> }> } }
    pdfjs.GlobalWorkerOptions.workerSrc = ''

    const loadingTask = pdfjs.getDocument({ data: uint8Array })
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    const parts: string[] = []

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item && item.str ? item.str : ''))
        .join(' ')
      parts.push(pageText)
    }

    const text = parts.join('\n')
    return NextResponse.json({ text, pages: numPages })
  } catch (err) {
    return errorResponse(err)
  }
}
