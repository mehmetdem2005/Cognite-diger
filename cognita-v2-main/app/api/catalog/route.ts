import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

function getUserSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function verifySuperAdmin(token: string) {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  const userSb = getUserSupabase(token)
  const { data } = await sb.from('admins').select('role').eq('user_id', user.id).single()
  return data?.role === 'super_admin' ? user : null
}

export async function GET() {
  try {
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    }
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('catalog_books')
      .select('id, title, author, cover_url, description, categories, language, level, total_pages, created_at, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] }, { headers })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('catalog_books')
      .insert(body)
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifySuperAdmin(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

    const { id } = await req.json()
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('catalog_books').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
