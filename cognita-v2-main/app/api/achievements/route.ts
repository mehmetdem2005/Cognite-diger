import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'

// Kullanıcı Başarıları
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const headers = {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
  }

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  try {
    const supabase = getServiceSupabase()
    const { data: unlockedAchievements } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', userId)

    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')

    const unlockedIds = new Set((unlockedAchievements || []).map((a: { achievement_id: string }) => a.achievement_id))
    const lockedAchievements = (allAchievements || []).filter((a: { id: string }) => !unlockedIds.has(a.id))

    return NextResponse.json({
      unlocked: unlockedAchievements || [],
      locked: lockedAchievements || []
    }, { headers })
  } catch (err) {
    return errorResponse(err)
  }
}
