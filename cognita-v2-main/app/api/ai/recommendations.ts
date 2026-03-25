import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 1. Kişiselleştirilmiş Tavsiyeler
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  const { data: userInterests } = await supabase
    .from('user_interests')
    .select('genre')
    .eq('user_id', userId)

  const genres = userInterests?.map((i: any) => i.genre) || []

  if (genres.length === 0) {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('is_public', true)
      .order('rating_count', { ascending: false })
      .limit(6)
    return NextResponse.json({ recommendations: data || [] })
  }

  const { data } = await supabase
    .from('recommendations')
    .select('book_id, book:books(*), reason, score')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(6)

  return NextResponse.json({ recommendations: data || [] })
}
