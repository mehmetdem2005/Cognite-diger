import { NextRequest, NextResponse } from 'next/server'
import { callAI, selectActiveProvider } from '@/lib/ai-provider-manager'
import { requireAuth } from '@/lib/auth'
import { chatSchema } from '@/lib/validation'
import { errorResponse } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { AI_CONTEXT_MEDIUM, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS } from '@/lib/constants'

const GROQ_MODELS: Record<string, string> = {
  fast: 'openai/gpt-oss-120b',
  quality: 'openai/gpt-oss-120b',
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`ai-chat:${user.id}`, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const body = chatSchema.parse(await req.json())
    const context = body.book_content ? body.book_content.slice(0, AI_CONTEXT_MEDIUM) : ''

    const provider = await selectActiveProvider()

    const modelOverride =
      provider.provider_name === 'groq' && body.groq_model && body.groq_model in GROQ_MODELS
        ? GROQ_MODELS[body.groq_model]
        : undefined

    const result = await callAI(
      {
        messages: [
          {
            role: 'system',
            content: `Sen "${body.book_title}" kitabı hakkında bilgi sahibi bir asistansın. ${context ? `Kitap içeriğinden alıntı:\n\n${context}\n\nBu bilgilere dayanarak` : 'Bu kitap hakkında genel bilginle'} Türkçe olarak kısa ve net cevap ver.`,
          },
          { role: 'user', content: body.message },
        ],
        maxTokens: 600,
      },
      modelOverride,
    )

    return NextResponse.json({
      response: result.content || 'Yanıt alınamadı.',
      activeProvider: provider.display_name,
      activeProviderName: provider.provider_name,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
