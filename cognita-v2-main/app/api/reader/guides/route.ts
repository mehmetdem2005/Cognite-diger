import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai-provider-manager'

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifyUser(token: string) {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const body = await req.json()
    const { book_id, section_key, prediction, character_notes, main_idea } = body
    if (!book_id || !section_key) {
      return NextResponse.json({ error: 'book_id ve section_key gerekli' }, { status: 400 })
    }

    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('reader_guides')
      .upsert({
        user_id: user.id,
        book_id,
        section_key,
        prediction: prediction || null,
        character_notes: character_notes || null,
        main_idea: main_idea || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,book_id,section_key' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}
