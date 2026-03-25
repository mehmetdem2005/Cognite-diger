import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai-provider-manager'

async function verifyUser(token: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { text, book_title } = await req.json()
    const content = text ? text.slice(0, 3000) : book_title

    const result = await callAI({
      messages: [{
        role: 'user',
        content: `"${book_title}" kitabını analiz et. Sadece JSON döndür, başka hiçbir şey yazma. Format:
{"summary":"...","themes":["...","...","..."],"concepts":["...","..."],"mood":"...","difficulty":"Kolay/Orta/Zor","target_audience":"..."}

Kitap içeriği: ${content}`,
      }],
      maxTokens: 800,
    })

    const clean = result.content.replace(/```json|```/g, '').trim()
    try {
      return NextResponse.json(JSON.parse(clean))
    } catch {
      return NextResponse.json({ error: 'AI geçersiz JSON döndürdü', detail: clean }, { status: 500 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai/analyze] AI error:', msg)
    return NextResponse.json({ error: 'Hata', detail: msg }, { status: 500 })
  }
}
