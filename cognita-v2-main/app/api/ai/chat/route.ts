import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI, selectActiveProvider } from '@/lib/ai-provider-manager'

const GROQ_MODELS = {
  fast: 'openai/gpt-oss-120b',
  quality: 'openai/gpt-oss-120b',
}

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

    const { message, book_content, book_title, groq_model } = await req.json()
    const context = book_content ? book_content.slice(0, 3000) : ''

    const provider = await selectActiveProvider()

    const modelOverride =
      provider.provider_name === 'groq' && groq_model in GROQ_MODELS
        ? GROQ_MODELS[groq_model as keyof typeof GROQ_MODELS]
        : undefined

    const result = await callAI(
      {
        messages: [
          {
            role: 'system',
            content: `Sen "${book_title}" kitabı hakkında bilgi sahibi bir asistansın. ${context ? `Kitap içeriğinden alıntı:\n\n${context}\n\nBu bilgilere dayanarak` : 'Bu kitap hakkında genel bilginle'} Türkçe olarak kısa ve net cevap ver.`,
          },
          { role: 'user', content: message },
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}
