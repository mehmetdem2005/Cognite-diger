import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function verifyUser(token: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

// POST /api/ai/generate-cover
// 1. Tries Open Library for real book cover
// 2. Falls back to Pollinations.ai — fetches full image server-side and returns base64
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { title, author } = await req.json()
    if (!title) return NextResponse.json({ error: 'title gerekli' }, { status: 400 })

    // ── 1. Open Library: real cover for real books ──────────────────────────
    const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ''}&limit=5&fields=cover_i,title`
    try {
      const olRes = await fetch(olUrl, { signal: AbortSignal.timeout(6000) })
      if (olRes.ok) {
        const olData = await olRes.json()
        const book = (olData.docs || []).find((d: any) => d.cover_i)
        if (book?.cover_i) {
          const coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          // Verify image actually exists
          try {
            const imgRes = await fetch(coverUrl, { signal: AbortSignal.timeout(5000) })
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer()
              const b64 = Buffer.from(buf).toString('base64')
              const mime = imgRes.headers.get('content-type') || 'image/jpeg'
              return NextResponse.json({ url: `data:${mime};base64,${b64}`, source: 'openlibrary' })
            }
          } catch { /* fall through */ }
        }
      }
    } catch { /* timeout or network error → fall through */ }

    // ── 2. Pollinations.ai: fetch full image server-side ────────────────────
    const authorPart = author ? ` by ${author}` : ''
    const prompt = `Professional artistic book cover for "${title}"${authorPart}. Modern design, evocative illustration, rich colors, elegant composition. No text, no words, no letters.`
    const seed = Math.abs(title.split('').reduce((acc: number, c: string) => acc * 31 + c.charCodeAt(0), 7)) % 999999
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=600&seed=${seed}&nologo=true&model=flux`

    try {
      const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(25000) })
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        const mime = imgRes.headers.get('content-type') || 'image/jpeg'
        return NextResponse.json({ url: `data:${mime};base64,${b64}`, source: 'pollinations' })
      }
    } catch { /* timeout → return error */ }

    return NextResponse.json({ error: 'Kapak görseli oluşturulamadı. Tekrar dene.' }, { status: 504 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
