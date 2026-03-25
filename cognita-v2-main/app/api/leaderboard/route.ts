import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Liderlik Tablosu
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || 'weekly'
  const limit = req.nextUrl.searchParams.get('limit') || '10'

  try {
    const { data: leaderboard } = await supabase
      .from('leaderboard')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .eq('period', period)
      .order('rank', { ascending: true })
      .limit(parseInt(limit))

    return NextResponse.json({ leaderboard })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
