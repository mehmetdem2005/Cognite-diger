import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai-provider-manager'

const VALID_CATEGORIES = [
  'roman','bilim','tarih','felsefe','psikoloji','kisisel-gelisim',
  'bilim-kurgu','fantastik','biyografi','din','siir','cocuk',
  'ekonomi','siyaset','sanat','yazilim','saglik','korku','romantik',
  'gezi','mizah','alinti',
]

const VALID_LANGUAGES = ['tr','en','de','fr','es','ru','ar','it','pt','ja','zh']
const VALID_LEVELS = ['A1','A2','B1','B2','C1','C2']

function normalizeCategory(raw: string): string | null {
  const s = raw.toLowerCase().trim().replace(/\s+/g, '-')
  if (VALID_CATEGORIES.includes(s)) return s
  const map: Record<string, string> = {
    'kisiselgelisim': 'kisisel-gelisim', 'kişisel-gelişim': 'kisisel-gelisim',
    'kişisel gelişim': 'kisisel-gelisim', 'bilimkurgu': 'bilim-kurgu',
    'bilim kurgu': 'bilim-kurgu', 'sciencefiction': 'bilim-kurgu',
    'science fiction': 'bilim-kurgu', 'sci-fi': 'bilim-kurgu',
    'fantasy': 'fantastik', 'roman': 'roman', 'novel': 'roman',
    'history': 'tarih', 'philosophy': 'felsefe', 'psychology': 'psikoloji',
    'self-help': 'kisisel-gelisim', 'self help': 'kisisel-gelisim',
    'biography': 'biyografi', 'children': 'cocuk', 'çocuk': 'cocuk',
    'poetry': 'siir', 'şiir': 'siir', 'religion': 'din', 'economics': 'ekonomi',
    'politics': 'siyaset', 'art': 'sanat', 'software': 'yazilim', 'health': 'saglik',
    'horror': 'korku', 'romance': 'romantik', 'travel': 'gezi', 'humor': 'mizah',
    'quote': 'alinti', 'quotes': 'alinti', 'science': 'bilim',
  }
  return map[s] || null
}

function extractJSON(raw: string): any {
  const clean = raw.replace(/```json|```/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch {}
  }
  return {}
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

    const { title, author, description, content } = await req.json()

    const snippet = content ? content.slice(0, 1000) : ''
    const prompt = `Classify this book. Return ONLY a JSON object.

Title: "${title}"
Author: "${author || 'Unknown'}"
${description ? `Description: "${description}"` : ''}
${snippet ? `Content: "${snippet}"` : ''}

Return exactly:
{"categories":["id1","id2"],"language":"xx","level":"B1"}

categories: pick 1-3 IDs from this EXACT list (use lowercase, exact spelling):
${VALID_CATEGORIES.join(', ')}

language: 2-letter code from: ${VALID_LANGUAGES.join(', ')}
level: CEFR level from: ${VALID_LEVELS.join(', ')}
(A1-A2=beginner, B1-B2=intermediate, C1-C2=advanced)

Return ONLY the JSON.`

    const result = await callAI({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 150,
      temperature: 0.1,
    })

    const parsed = extractJSON(result.content)

    const categories = (parsed.categories || [])
      .map((c: string) => normalizeCategory(c))
      .filter(Boolean)
      .slice(0, 3) as string[]

    const language = VALID_LANGUAGES.includes(parsed.language?.toLowerCase?.())
      ? parsed.language.toLowerCase()
      : 'tr'
    const level = VALID_LEVELS.includes(parsed.level?.toUpperCase?.())
      ? parsed.level.toUpperCase()
      : null

    return NextResponse.json({ categories, language, level })
  } catch (err: any) {
    console.error('[classify]', err?.message || err)
    return NextResponse.json({ error: 'Sınıflandırma yapılamadı' }, { status: 500 })
  }
}
