import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { vocabularyPostSchema, vocabularyPatchSchema } from '@/lib/validation'
import { errorResponse } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('vocabulary')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = vocabularyPostSchema.parse(await req.json())
    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('vocabulary')
      .insert({
        user_id: user.id,
        word: body.word,
        meaning: body.meaning,
        example: body.example || null,
        level: body.level || null,
        book_id: body.book_id || null,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = vocabularyPatchSchema.parse(await req.json())
    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('vocabulary')
      .update({ is_learned: body.is_learned })
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

    const sb = getServiceSupabase()
    const { error } = await sb.from('vocabulary').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
