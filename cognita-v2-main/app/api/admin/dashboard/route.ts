import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type AdminRole = 'super_admin' | 'admin' | 'moderator'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function verifyAdmin(token: string): Promise<{ id: string; role: AdminRole } | null> {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null

  const { data } = await sb
    .from('admins')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!data) return null
  return { id: data.id, role: data.role as AdminRole }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const admin = await verifyAdmin(token)
    if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

    const sb = getServiceSupabase()
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const dayStartIso = dayStart.toISOString()
    const last24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const [
      usersCount,
      newUsersToday,
      booksPublicCount,
      catalogPublishedCount,
      activeSessionsToday,
      publicHighlightsCount,
      adminsCount,
      activeSessions24h,
    ] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dayStartIso),
      sb.from('books').select('*', { count: 'exact', head: true }).eq('is_public', true),
      sb.from('catalog_books').select('*', { count: 'exact', head: true }).eq('is_published', true),
      sb.from('reading_sessions').select('*', { count: 'exact', head: true }).gte('updated_at', dayStartIso),
      sb.from('highlights').select('*', { count: 'exact', head: true }).eq('is_public', true),
      sb.from('admins').select('*', { count: 'exact', head: true }),
      sb.from('reading_sessions').select('user_id').gte('updated_at', last24hIso).limit(5000),
    ])

    const activeUserSet = new Set((activeSessions24h.data || []).map(row => row.user_id))

    return NextResponse.json({
      data: {
        role: admin.role,
        counters: {
          total_users: usersCount.count || 0,
          new_users_today: newUsersToday.count || 0,
          active_users_24h: activeUserSet.size,
          public_books: booksPublicCount.count || 0,
          catalog_books: catalogPublishedCount.count || 0,
          reading_sessions_today: activeSessionsToday.count || 0,
          public_highlights: publicHighlightsCount.count || 0,
          total_admins: adminsCount.count || 0,
        },
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
