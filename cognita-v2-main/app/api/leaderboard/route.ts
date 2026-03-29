import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'

// Liderlik Tablosu
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || 'weekly'
  const limitParam = req.nextUrl.searchParams.get('limit') || '10'
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100)
  const headers = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  }

  try {
    const supabase = getServiceSupabase()
    const { data: leaderboard } = await supabase
      .from('leaderboard')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .eq('period', period)
      .order('rank', { ascending: true })
      .limit(limit)

    return NextResponse.json({ leaderboard }, { headers })
  } catch (err) {
    return errorResponse(err)
  }
}
