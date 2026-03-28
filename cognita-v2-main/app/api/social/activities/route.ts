import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Sosyal Aktiviteler (Arkadaşların Son Aktiviteleri)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const limit = req.nextUrl.searchParams.get('limit') || '10'
  const headers = {
    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
  }

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  try {
    // Takip edilen kullanıcıları al
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    const followingIds = following?.map(f => f.following_id) || []

    if (followingIds.length === 0) {
      return NextResponse.json({ activities: [] }, { headers })
    }

    const { data: activities } = await supabase
      .from('social_activities')
      .select('*, user:profiles(id, full_name, avatar_url, username)')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    return NextResponse.json({ activities }, { headers })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}
