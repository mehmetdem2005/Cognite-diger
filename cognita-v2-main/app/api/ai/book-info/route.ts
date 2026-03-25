import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai-provider-manager'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Try to extract a JSON object from potentially messy AI output */
function extractJSON(raw: string): Record<string, string> {
  const clean = raw.replace(/```json|```/g, '').trim()
  // Direct parse first
  try { return JSON.parse(clean) } catch {}
  // Find first { ... } block
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch {}
  }
  return {}
}

export async function POST(req: NextRequest) {
  try {
    const sb = getServiceSupabase()
    const today = new Date().toISOString().split('T')[0]

    // Authenticate user (optional — limit only applies when authenticated)
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    let userId: string | null = null
    let usedToday = 0
    let needsReset = false

    if (token) {
      const { data: { user } } = await sb.auth.getUser(token)
      userId = user?.id ?? null
    }

    if (userId) {
      // Fetch limit setting + user usage in parallel
      const [settingRes, profileRes] = await Promise.all([
        sb.from('app_settings').select('value').eq('key', 'daily_ai_requests_per_user').single(),
        sb.from('profiles').select('ai_requests_today, ai_requests_reset_date').eq('id', userId).single(),
      ])

      const dailyLimit = parseInt(settingRes.data?.value ?? '10', 10)
      needsReset = profileRes.data?.ai_requests_reset_date !== today
      usedToday = needsReset ? 0 : (profileRes.data?.ai_requests_today ?? 0)

      if (usedToday >= dailyLimit) {
        return NextResponse.json(
          { error: `Günlük AI limitine ulaştın (${dailyLimit} istek). Yarın tekrar deneyebilirsin.` },
          { status: 429 }
        )
      }
    }

    const { content, filename } = await req.json()
    // Use first 2000 chars — title/author are near the beginning, saves tokens
    const snippet = (content || '').slice(0, 2000)

    const prompt = `Analyze the book data below. Return ONLY a valid JSON object with exactly these 3 fields.

FILENAME: "${filename || ''}"
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

    const parsed = extractJSON(result.content)

    // Increment user's daily counter after successful AI call
    if (userId) {
      await sb.from('profiles').update({
        ai_requests_today: usedToday + 1,
        ai_requests_reset_date: today,
      }).eq('id', userId)
    }

    return NextResponse.json({
      title: parsed.title || '',
      author: parsed.author || '',
      description: parsed.description || '',
    })
  } catch (err: any) {
    const msg = err?.message || String(err)
    console.error('[book-info]', msg)
    return NextResponse.json({ error: 'Bilgi alınamadı', detail: msg }, { status: 500 })
  }
}
