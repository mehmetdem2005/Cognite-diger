import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const groupId = req.nextUrl.searchParams.get('group_id')
    const sb = getServiceSupabase()

    if (groupId) {
      const { data: messages, error } = await sb
        .from('reading_group_messages')
        .select('id,group_id,message,section_key,created_at,user_id,profiles:user_id(username,full_name,avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ messages: messages || [] })
    }

    const { data, error } = await sb
      .from('reading_groups')
      .select('*, reading_group_members!left(user_id)')
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

    const body = await req.json()
    const action = body.action || 'create'
    const sb = getServiceSupabase()

    if (action === 'create') {
      const { name, description, is_public, book_id } = body
      if (!name || typeof name !== 'string' || name.length > 200) {
        return NextResponse.json({ error: 'name gerekli (max 200 karakter)' }, { status: 400 })
      }

      const { data: group, error } = await sb
        .from('reading_groups')
        .insert({
          owner_id: user.id,
          name,
          description: description || null,
          is_public: is_public !== false,
          book_id: book_id || null,
        })
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await sb.from('reading_group_members').insert({ group_id: group.id, user_id: user.id, role: 'owner' })
      return NextResponse.json({ data: group })
    }

    if (action === 'join') {
      const groupId = body.group_id
      if (!groupId) return NextResponse.json({ error: 'group_id gerekli' }, { status: 400 })

      const { error } = await sb
        .from('reading_group_members')
        .upsert({ group_id: groupId, user_id: user.id, role: 'member' }, { onConflict: 'group_id,user_id' })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'message') {
      const { group_id, message, section_key } = body
      if (!group_id || !message || typeof message !== 'string') {
        return NextResponse.json({ error: 'group_id ve message gerekli' }, { status: 400 })
      }
      if (message.length > 5000) {
        return NextResponse.json({ error: 'Mesaj çok uzun (max 5000 karakter)' }, { status: 400 })
      }

      const { data: created, error } = await sb
        .from('reading_group_messages')
        .insert({ group_id, user_id: user.id, message, section_key: section_key || null })
        .select('id')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data } = await sb
        .from('reading_group_messages')
        .select('id,group_id,message,section_key,created_at,user_id,profiles:user_id(username,full_name,avatar_url)')
        .eq('id', created.id)
        .single()

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Gecersiz action' }, { status: 400 })
  } catch (err) {
    return errorResponse(err)
  }
}
