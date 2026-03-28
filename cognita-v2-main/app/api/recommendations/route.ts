import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Kişiselleştirilmiş Tavsiyeler
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const headers = {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
  }
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  try {
    const { data: recommendations } = await supabase
      .from('recommendations')
      .select('*, book:books(*)')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(6)

    if (!recommendations || recommendations.length === 0) {
      const { data: trendingBooks } = await supabase
        .from('books')
        .select('*')
        .eq('is_public', true)
        .order('rating_count', { ascending: false })
        .limit(6)
      return NextResponse.json({ recommendations: trendingBooks }, { headers })
    }

    return NextResponse.json({ recommendations }, { headers })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}
