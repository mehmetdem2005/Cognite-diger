import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { bookCreateSchema } from '@/lib/validation'
import { errorResponse } from '@/lib/api-utils'

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
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const sb = getClient(token)
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { data, error } = await sb.from('books').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return errorResponse(err)
  }
}

// POST /api/books — Insert a book bypassing RLS using service role
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = bookCreateSchema.parse(await req.json())
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const sb = getClient(token || undefined)

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      title: body.title,
      author: body.author || null,
      cover_url: body.cover_url || null,
      file_type: body.file_type,
      total_pages: body.total_pages,
      is_public: body.is_public,
      tags: body.tags,
    }
    if (body.description) insertData.description = body.description
    if (body.content) insertData.content = body.content

    const { data, error } = await sb.from('books').insert(insertData).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return errorResponse(err)
  }
}
