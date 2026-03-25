import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient(userToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) return createClient(url, serviceKey)
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: userToken ? { Authorization: `Bearer ${userToken}` } : {} },
  })
}

// GET /api/books/[id]/content — Fetch book content from DB
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const sb = getClient(token)
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { data, error } = await sb
      .from('books')
      .select('content')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ content: data?.content || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
