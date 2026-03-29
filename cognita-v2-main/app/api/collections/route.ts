import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { collectionCreateSchema, collectionPatchSchema } from '@/lib/validation'
import { errorResponse } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('collections')
      .select('*, collection_books(book_id)')
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

    const body = collectionCreateSchema.parse(await req.json())
    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('collections')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        cover_url: body.cover_url || null,
        is_public: body.is_public,
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

    const body = collectionPatchSchema.parse(await req.json())
    const sb = getServiceSupabase()

    if (body.action === 'add_book') {
      const { error } = await sb.from('collection_books').insert({ collection_id: body.collection_id, book_id: body.book_id })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'remove_book') {
      const { error } = await sb.from('collection_books').delete().eq('collection_id', body.collection_id).eq('book_id', body.book_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
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
    const { error } = await sb.from('collections').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
