import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-provider-manager'
import { requireAuth } from '@/lib/auth'
import { flashcardsSchema } from '@/lib/validation'
import { safeParseJSON, errorResponse } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { AI_CONTEXT_SHORT, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`flashcards:${user.id}`, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const body = flashcardsSchema.parse(await req.json())

    const result = await callAI({
      messages: [{
        role: 'user',
        content: `"${body.bookTitle}" kitabından 5 flashcard oluştur. Sadece JSON array döndür, başka hiçbir şey yazma. Format: [{"question":"...","answer":"..."}]\n\nMetin: ${body.text.slice(0, AI_CONTEXT_SHORT)}`
      }],
      maxTokens: 1000,
    })

    const { data, error } = safeParseJSON<unknown[]>(result.content)
    if (error || !data) {
      return NextResponse.json({ error: error || 'AI geçersiz JSON döndürdü' }, { status: 500 })
    }
    return NextResponse.json({ cards: data })
  } catch (err) {
    return errorResponse(err)
  }
}
