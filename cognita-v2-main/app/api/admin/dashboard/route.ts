import { NextRequest, NextResponse } from 'next/server'
import { extractToken, getServiceSupabase, verifyAdmin } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req)
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

    const activeUserSet = new Set((activeSessions24h.data || []).map((row: { user_id: string }) => row.user_id))

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
  } catch (err) {
    return errorResponse(err)
  }
}
