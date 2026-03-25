import { NextRequest, NextResponse } from 'next/server'

// Gutenberg header/footer temizle
function cleanGutenbergText(raw: string): string {
  const startMarkers = [
    /\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG[\s\S]*?\*\*\*/i,
    /\*\*\*START OF THE PROJECT GUTENBERG[\s\S]*?\*\*\*/i,
  ]
  const endMarkers = [
    /\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*/i,
    /\*\*\*END OF THE PROJECT GUTENBERG[^\n]*/i,
    /End of the Project Gutenberg[^\n]*/i,
  ]
  let text = raw
  for (const marker of startMarkers) {
    if (text.search(marker) !== -1) {
      text = text.replace(marker, '')
      const afterMarker = text.indexOf('\n\n')
      if (afterMarker !== -1) text = text.slice(afterMarker)
      break
    }
  }
  for (const marker of endMarkers) {
    const match = text.search(marker)
    if (match !== -1) { text = text.slice(0, match); break }
  }
  return text.trim()
}

const TEXT_FORMATS = [
  'text/plain; charset=utf-8',
  'text/plain; charset=us-ascii',
  'text/plain',
]

// Bir URL'den metin çek (timeout ile)
async function tryFetch(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Cognita/2.0 (educational reading platform)' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  if (!text || text.length < 200) throw new Error('too short')
  return text
}

export async function POST(req: NextRequest) {
  try {
    const { formats, bookId } = await req.json() as {
      formats: Record<string, string>
      bookId?: number
    }

    // Önce hızlı Gutenberg cache URL'lerini dene (redirect yok)
    const candidateUrls: string[] = []

    if (bookId) {
      candidateUrls.push(
        `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`,
        `https://gutenberg.pglaf.org/cache/epub/${bookId}/pg${bookId}.txt`,
      )
    }

    // formats objesinden URL'leri ekle
    for (const fmt of TEXT_FORMATS) {
      if (formats[fmt]) candidateUrls.push(formats[fmt])
    }

    if (candidateUrls.length === 0) {
      return NextResponse.json({ content: null, error: 'Metin URL bulunamadı' })
    }

    // Tüm URL'leri paralel dene, ilk başarılıyı al (15s timeout)
    let raw: string | null = null
    let lastError = ''

    try {
      raw = await Promise.any(
        candidateUrls.map(url => tryFetch(url, 15_000))
      )
    } catch (err: any) {
      lastError = err?.errors?.map((e: any) => e?.message).join(', ') || err.message || 'tüm URLler başarısız'
    }

    if (!raw) {
      return NextResponse.json({ content: null, error: lastError || 'İndirilemedi' })
    }

    // 600KB ile sınırla (büyük kitaplar çok yavaş)
    const MAX_BYTES = 600_000
    if (raw.length > MAX_BYTES) {
      raw = raw.slice(0, MAX_BYTES)
    }

    const content = cleanGutenbergText(raw)
    return NextResponse.json({ content })

  } catch (err: any) {
    return NextResponse.json({ content: null, error: err.message }, { status: 500 })
  }
}
