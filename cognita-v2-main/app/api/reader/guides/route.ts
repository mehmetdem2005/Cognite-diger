import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-provider-manager'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { guidePutSchema } from '@/lib/validation'
import { errorResponse } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const bookId = req.nextUrl.searchParams.get('book_id')
    const sectionKey = req.nextUrl.searchParams.get('section_key')
    if (!bookId || !sectionKey) {
      return NextResponse.json({ error: 'book_id ve section_key gerekli' }, { status: 400 })
    }

    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('reader_guides')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('section_key', sectionKey)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || null })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = guidePutSchema.parse(await req.json())

    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('reader_guides')
      .upsert({
        user_id: user.id,
        book_id: body.book_id,
        section_key: body.section_key,
        prediction: body.prediction || null,
        character_notes: body.character_notes || null,
        main_idea: body.main_idea || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,book_id,section_key' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const { action, content } = body
    if (action !== 'feedback') return NextResponse.json({ error: 'Gecersiz action' }, { status: 400 })

    const result = await callAI({
      messages: [
        {
          role: 'user',
          content: `Asagidaki okuma rehberi notlarini degerlendir. Ogrenciye motivasyonlu, somut, kisa geri bildirim ver. 120 kelimeyi gecme.\n${JSON.stringify(content || {})}`,
        },
      ],
      maxTokens: 300,
    })

    return NextResponse.json({ feedback: result.content })
  } catch (err) {
    return errorResponse(err)
  }
}
