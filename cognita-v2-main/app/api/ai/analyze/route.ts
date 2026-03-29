import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-provider-manager'
import { requireAuth } from '@/lib/auth'
import { analyzeSchema } from '@/lib/validation'
import { safeParseJSON, errorResponse } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { AI_CONTEXT_MEDIUM, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`ai-analyze:${user.id}`, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const body = analyzeSchema.parse(await req.json())
    const content = body.text ? body.text.slice(0, AI_CONTEXT_MEDIUM) : body.book_title

    const result = await callAI({
      messages: [{
        role: 'user',
        content: `"${body.book_title}" kitabını analiz et. Sadece JSON döndür, başka hiçbir şey yazma. Format:
{"summary":"...","themes":["...","...","..."],"concepts":["...","..."],"mood":"...","difficulty":"Kolay/Orta/Zor","target_audience":"..."}

Kitap içeriği: ${content}`,
      }],
      maxTokens: 800,
    })

    const { data, error } = safeParseJSON(result.content)
    if (error || !data) {
      return NextResponse.json({ error: error || 'AI geçersiz JSON döndürdü' }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return errorResponse(err)
  }
}
