import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { data: unlockedAchievements } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', userId)

    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')

    const unlockedIds = new Set(unlockedAchievements?.map(a => a.achievement_id))
    const lockedAchievements = allAchievements?.filter(a => !unlockedIds.has(a.id))

    return NextResponse.json({
      unlocked: unlockedAchievements || [],
      locked: lockedAchievements || []
    }, { headers })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}
