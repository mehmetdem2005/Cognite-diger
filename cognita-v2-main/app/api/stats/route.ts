import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// İstatistikler
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const periodType = req.nextUrl.searchParams.get('type') || 'weekly'

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  try {
    // Bu hafta/ay istatistikleri
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', periodType)
      .order('period_start', { ascending: false })
      .limit(1)

    // Geçen hafta/ay istatistikleri
    const { data: previousStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', periodType)
      .order('period_start', { ascending: false })
      .range(1, 1)

    return NextResponse.json({
      current: currentStats?.[0],
      previous: previousStats?.[0],
      comparison: {
        pagesReadChange: (currentStats?.[0]?.pages_read || 0) - (previousStats?.[0]?.pages_read || 0),
        booksReadChange: (currentStats?.[0]?.books_finished || 0) - (previousStats?.[0]?.books_finished || 0),
        xpChange: (currentStats?.[0]?.total_xp_earned || 0) - (previousStats?.[0]?.total_xp_earned || 0)
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
