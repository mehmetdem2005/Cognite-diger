import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-provider-manager'
import { requireAuth } from '@/lib/auth'
import { classifySchema } from '@/lib/validation'
import { safeParseJSON, errorResponse } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS } from '@/lib/constants'

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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`classify:${user.id}`, RATE_LIMIT_AI_MAX, RATE_LIMIT_AI_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const body = classifySchema.parse(await req.json())

    const snippet = body.content ? body.content.slice(0, 1000) : ''
    const prompt = `Classify this book. Return ONLY a JSON object.

Title: "${body.title}"
Author: "${body.author || 'Unknown'}"
${body.description ? `Description: "${body.description}"` : ''}
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

    const { data: parsed } = safeParseJSON<Record<string, unknown>>(result.content)
    const parsedObj = parsed || {}

    const categories = (Array.isArray(parsedObj.categories) ? parsedObj.categories : [])
      .map((c: unknown) => typeof c === 'string' ? normalizeCategory(c) : null)
      .filter(Boolean)
      .slice(0, 3) as string[]

    const rawLang = typeof parsedObj.language === 'string' ? parsedObj.language.toLowerCase() : ''
    const language = VALID_LANGUAGES.includes(rawLang) ? rawLang : 'tr'

    const rawLevel = typeof parsedObj.level === 'string' ? parsedObj.level.toUpperCase() : ''
    const level = VALID_LEVELS.includes(rawLevel) ? rawLevel : null

    return NextResponse.json({ categories, language, level })
  } catch (err) {
    return errorResponse(err)
  }
}
