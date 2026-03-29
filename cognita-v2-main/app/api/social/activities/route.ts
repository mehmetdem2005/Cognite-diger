import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'

// Sosyal Aktiviteler (Arkadaşların Son Aktiviteleri)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const limitParam = req.nextUrl.searchParams.get('limit') || '10'
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100)
  const headers = {
    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
  }

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  try {
    const supabase = getServiceSupabase()
    // Takip edilen kullanıcıları al
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    const followingIds = (following || []).map((f: { following_id: string }) => f.following_id)

    if (followingIds.length === 0) {
      return NextResponse.json({ activities: [] }, { headers })
    }

    const { data: activities } = await supabase
      .from('social_activities')
      .select('*, user:profiles(id, full_name, avatar_url, username)')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ activities }, { headers })
  } catch (err) {
    return errorResponse(err)
  }
}
