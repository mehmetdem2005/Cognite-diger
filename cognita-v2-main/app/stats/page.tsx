'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { ArrowLeft, Flame, BookOpen, Trophy, Zap, TrendingUp, Clock } from 'lucide-react'
import { BOOK_CATEGORIES } from '@/lib/categories'

interface Profile {
  full_name: string | null; username: string | null
  streak_days: number; total_pages_read: number; xp: number; level: number
  last_read_at: string | null
}
interface Session {
  book_id: string; progress_percent: number; wpm_measured: number | null
  updated_at: string; session_duration_seconds: number
  books: { title: string; tags: string[] }
}

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export default function StatsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) fetchData() }, [user])

  const fetchData = async () => {
    const [{ data: prof }, { data: sess }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      supabase.from('reading_sessions').select('*, books(title, tags)').eq('user_id', user!.id),
    ])
    if (prof) setProfile(prof)
    if (sess) setSessions(sess as Session[])
    setFetching(false)
  }

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  if (fetching) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '5rem 1rem 1rem' }}>
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '16px' }} />)}
      </div>
    </main>
  )

  const finished = sessions.filter(s => s.progress_percent >= 100).length
  const reading = sessions.filter(s => s.progress_percent > 0 && s.progress_percent < 100).length
  const notStarted = sessions.filter(s => s.progress_percent === 0).length
  const avgWpm = sessions.filter(s => s.wpm_measured && s.wpm_measured > 0).map(s => s.wpm_measured!).reduce((a, b, _, arr) => a + b / arr.length, 0)
  const totalMinutes = Math.round(sessions.reduce((a, s) => a + (s.session_duration_seconds || 0), 0) / 60)

  // Weekly activity: which of last 7 days had a session updated
  const last7 = getLast7Days()
  const activeDays = new Set(sessions.map(s => s.updated_at?.split('T')[0]).filter(Boolean))
  const weekActivity = last7.map(day => activeDays.has(day))

  // Favorite categories
  const catCount: Record<string, number> = {}
  sessions.forEach(s => {
    const tags = (s.books as any)?.tags || []
    tags.forEach((t: string) => { catCount[t] = (catCount[t] || 0) + 1 })
  })
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const xpToNext = (profile?.level || 1) * 200
  const xpProgress = Math.min(100, Math.round(((profile?.xp || 0) % xpToNext) / xpToNext * 100))
  const todayRead = profile?.last_read_at ? new Date(profile.last_read_at).toDateString() === new Date().toDateString() : false

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: '54px', display: 'flex', alignItems: 'center', gap: '0.75rem', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--text)" />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>İstatistikler</h1>
      </header>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* XP + Seviye */}
        <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', borderRadius: '20px', padding: '1.25rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.78rem', opacity: 0.8, marginBottom: '0.2rem' }}>Seviye {profile?.level || 1}</p>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{profile?.xp || 0} XP</h2>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '0.5rem 0.9rem', fontSize: '1.5rem' }}>
              {profile && profile.level >= 10 ? '💎' : profile && profile.level >= 5 ? '🌟' : '⭐'}
            </div>
          </div>
          <div style={{ marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>Sonraki seviyeye</span>
            <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>{xpProgress}%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.25)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${xpProgress}%`, background: 'white', borderRadius: '3px', transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Ana istatistikler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {[
            { icon: <Flame size={20} color="var(--accent)" />, label: 'Gün Serisi', value: profile?.streak_days || 0, unit: 'gün', highlight: todayRead },
            { icon: <BookOpen size={20} color="#43E97B" />, label: 'Biten Kitap', value: finished, unit: 'kitap', highlight: false },
            { icon: <TrendingUp size={20} color="var(--accent-2)" />, label: 'Toplam Sayfa', value: profile?.total_pages_read || 0, unit: 'sayfa', highlight: false },
            { icon: <Clock size={20} color="#F093FB" />, label: 'Okuma Süresi', value: totalMinutes >= 60 ? Math.floor(totalMinutes / 60) : totalMinutes, unit: totalMinutes >= 60 ? 'saat' : 'dk', highlight: false },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem', border: `1px solid ${s.highlight ? 'var(--accent)' : 'var(--border)'}`, boxShadow: s.highlight ? '0 0 0 2px rgba(64,93,230,0.15)' : 'none' }}>
              <div style={{ marginBottom: '0.5rem' }}>{s.icon}</div>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{typeof s.value === 'number' ? s.value.toLocaleString('tr') : s.value}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.unit} · {s.label}</p>
            </div>
          ))}
        </div>

        {/* Kitap durumu */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Kitap Durumu</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Bitti', count: finished, color: '#43E97B' },
              { label: 'Devam', count: reading, color: 'var(--accent)' },
              { label: 'Bekliyor', count: notStarted, color: 'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '0.75rem 0.5rem', borderRadius: '12px', background: 'var(--bg-soft)' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.count}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          {sessions.length > 0 && (
            <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ flex: finished, background: '#43E97B', transition: 'flex 0.8s' }} />
              <div style={{ flex: reading, background: 'var(--accent)', transition: 'flex 0.8s' }} />
              <div style={{ flex: Math.max(notStarted, 0.01), background: 'var(--bg-soft)', transition: 'flex 0.8s' }} />
            </div>
          )}
        </div>

        {/* Haftalık aktivite */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Son 7 Gün</p>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            {last7.map((day, i) => {
              const active = weekActivity[i]
              const dayOfWeek = new Date(day).getDay()
              const label = DAY_LABELS[dayOfWeek === 0 ? 6 : dayOfWeek - 1]
              const isToday = day === new Date().toISOString().split('T')[0]
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '100%', height: '48px', borderRadius: '8px', background: active ? 'linear-gradient(180deg, var(--accent), var(--accent-2))' : 'var(--bg-soft)', border: isToday ? '2px solid var(--accent)' : 'none', transition: 'all 0.3s' }} />
                  <span style={{ fontSize: '0.62rem', color: isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 400 }}>{label}</span>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
            {weekActivity.filter(Boolean).length} / 7 gün aktif
          </p>
        </div>

        {/* Okuma hızı */}
        {avgWpm > 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(64,93,230,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={24} color="var(--accent)" />
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Ortalama Okuma Hızı</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{Math.round(avgWpm)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>kelime/dk</span></p>
              <p style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.1rem' }}>
                {avgWpm < 150 ? 'Dikkatli okuyucu' : avgWpm < 250 ? 'Ortalama hız' : avgWpm < 400 ? 'Hızlı okuyucu' : '⚡ Süper hızlı!'}
              </p>
            </div>
          </div>
        )}

        {/* En çok okunan türler */}
        {topCats.length > 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Favori Türler</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {topCats.map(([catId, count], i) => {
                const cat = BOOK_CATEGORIES.find(c => c.id === catId)
                if (!cat) return null
                const maxCount = topCats[0][1]
                const pct = Math.round(count / maxCount * 100)
                return (
                  <div key={catId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{cat.icon}</span> {cat.label}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{count} kitap</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? 'linear-gradient(90deg, var(--accent), var(--accent-2))' : 'var(--border-strong)', borderRadius: '3px', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rozetler özet */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Başarılar</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { icon: '📖', title: 'İlk Kitap', earned: sessions.length >= 1 },
              { icon: '🔥', title: '3 Gün Seri', earned: (profile?.streak_days || 0) >= 3 },
              { icon: '⚡', title: 'Haftalık', earned: (profile?.streak_days || 0) >= 7 },
              { icon: '📚', title: '100 Sayfa', earned: (profile?.total_pages_read || 0) >= 100 },
              { icon: '🏆', title: '500 Sayfa', earned: (profile?.total_pages_read || 0) >= 500 },
              { icon: '💎', title: 'Elit', earned: (profile?.total_pages_read || 0) >= 1000 },
              { icon: '🚀', title: 'Hızlı', earned: (profile?.xp || 0) >= 500 },
              { icon: '🌟', title: 'Seviye 5', earned: (profile?.level || 1) >= 5 },
            ].map(badge => (
              <div key={badge.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', opacity: badge.earned ? 1 : 0.3, filter: badge.earned ? 'none' : 'grayscale(1)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: badge.earned ? 'rgba(64,93,230,0.1)' : 'var(--bg-soft)', border: `1.5px solid ${badge.earned ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  {badge.icon}
                </div>
                <span style={{ fontSize: '0.6rem', color: badge.earned ? 'var(--text)' : 'var(--text-muted)', fontWeight: badge.earned ? 600 : 400, textAlign: 'center' }}>{badge.title}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
