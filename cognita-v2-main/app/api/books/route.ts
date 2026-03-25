import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase client that can write to the books table.
 * - Service role key: bypasses RLS entirely (preferred)
 * - Fallback: anon key + user's JWT in Authorization header so auth.uid() works with RLS
 */
function getClient(userToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createClient(url, serviceKey)
  }
  // Fallback: pass user JWT so RLS policies can resolve auth.uid()
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: userToken ? { Authorization: `Bearer ${userToken}` } : {} },
  })
}

// GET /api/books — Fetch user's books bypassing RLS using service role
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const sb = getClient(token)
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { data, error } = await sb.from('books').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/books — Insert a book bypassing RLS using service role
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const sb = getClient(token)

    // Verify user from token
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const body = await req.json()

    const insertData: Record<string, any> = {
      user_id: user.id,
      title: body.title,
      author: body.author || null,
      cover_url: body.cover_url || null,
      file_type: body.file_type || 'text',
      total_pages: body.total_pages || 1,
      is_public: body.is_public ?? false,
      tags: body.tags || [],
    }
    if (body.description) insertData.description = body.description
    if (body.content) insertData.content = body.content

    const { data, error } = await sb.from('books').insert(insertData).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
