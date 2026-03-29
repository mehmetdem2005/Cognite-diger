import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, extractToken, verifySuperAdmin } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'

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
  } catch (err) {
    return errorResponse(err)
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
  } catch (err) {
    return errorResponse(err)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req)
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifySuperAdmin(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

    const { id } = await req.json()
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('catalog_books').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
