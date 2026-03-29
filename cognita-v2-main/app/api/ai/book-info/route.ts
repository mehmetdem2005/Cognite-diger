import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-provider-manager'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { bookInfoSchema } from '@/lib/validation'
import { safeParseJSON, errorResponse } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { AI_CONTEXT_SHORT, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`book-info:${user.id}`, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const sb = getServiceSupabase()
    const today = new Date().toISOString().split('T')[0]

    // Fetch limit setting + user usage in parallel
    const [settingRes, profileRes] = await Promise.all([
      sb.from('app_settings').select('value').eq('key', 'daily_ai_requests_per_user').single(),
      sb.from('profiles').select('ai_requests_today, ai_requests_reset_date').eq('id', user.id).single(),
    ])

    const dailyLimit = parseInt(settingRes.data?.value ?? '10', 10)
    const needsReset = profileRes.data?.ai_requests_reset_date !== today
    const usedToday = needsReset ? 0 : (profileRes.data?.ai_requests_today ?? 0)

    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        { error: `Günlük AI limitine ulaştın (${dailyLimit} istek). Yarın tekrar deneyebilirsin.` },
        { status: 429 }
      )
    }

    const body = bookInfoSchema.parse(await req.json())
    // Use first 2000 chars — title/author are near the beginning, saves tokens
    const snippet = body.content.slice(0, AI_CONTEXT_SHORT)

    const prompt = `Analyze the book data below. Return ONLY a valid JSON object with exactly these 3 fields.

FILENAME: "${body.filename}"
CONTENT (first 2000 chars):
"""
${snippet}
"""

JSON to return:
{"title":"...","author":"...","description":"..."}

TITLE: Look in content first (title page / first page). If not found, parse filename:
- "yuval-noah-harari-sapiens-hayvanlardan-tanrilara" → "Sapiens: Hayvanlardan Tanrılara"
- "orhan-pamuk-benim-adim-kirmizi" → "Benim Adım Kırmızı"
Author names come first in filename. Use proper Turkish capitalization.

AUTHOR: Look in content first. If not found, parse from filename (first 2-3 words before the book title). Proper capitalization.

DESCRIPTION: 2-3 sentences in TURKISH. Original writing — do NOT copy sentences from the content. Professional, captivating. Do not start with "Bu kitap".

Return ONLY the JSON. No markdown, no extra text.`

    const result = await callAI({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 700,
      temperature: 0.4,
    })

    const { data: parsed } = safeParseJSON<Record<string, string>>(result.content)

    // Increment user's daily counter after successful AI call
    await sb.from('profiles').update({
      ai_requests_today: usedToday + 1,
      ai_requests_reset_date: today,
    }).eq('id', user.id)

    return NextResponse.json({
      title: parsed?.title || '',
      author: parsed?.author || '',
      description: parsed?.description || '',
    })
  } catch (err) {
    return errorResponse(err)
  }
}
