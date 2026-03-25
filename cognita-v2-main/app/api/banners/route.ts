import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Dinamik Bannerlar
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  try {
    // Aktif bannerları al
    const { data: banners } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.now()`)

    if (!userId) {
      return NextResponse.json({ banners: banners || [] })
    }

    // Kullanıcının streak'ini kontrol et
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_days, last_read_at')
      .eq('id', userId)
      .single()

    // Son okuma zamanı kontrol et (2 günden fazla geçmiş mi)
    let streakWarning = false
    if (profile?.last_read_at) {
      const lastRead = new Date(profile.last_read_at)
      const daysSinceRead = Math.floor((Date.now() - lastRead.getTime()) / (1000 * 60 * 60 * 24))
      streakWarning = daysSinceRead >= 2
    }

    // Streaki kurtarma bannerını ekle
    const finalBanners = banners || []
    if (streakWarning && profile?.streak_days) {
      finalBanners.unshift({
        id: 'streak-warning',
        title: `${profile.streak_days} günlük serin tehlikede! 🔥`,
        message: 'Streakini kurtarmak için bugün biraz oku',
        banner_type: 'streak_warning',
        icon: '⚠️',
        cta_text: 'Kitap Aç',
        cta_link: '/library'
      })
    }

    return NextResponse.json({ banners: finalBanners })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 })
  }
}
