'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import SideDrawer from '@/components/ui/SideDrawer'
import DailyQuote from '@/components/ui/DailyQuote'
import DynamicBanners from '@/components/ui/DynamicBanners'
import QuickActionButtons from '@/components/ui/QuickActionButtons'
import RecommendedForYou from '@/components/ui/RecommendedForYou'
import ChallengesSection from '@/components/ui/ChallengesSection'
import SocialActivityFeed from '@/components/ui/SocialActivityFeed'
import ExploreByCategory from '@/components/ui/ExploreByCategory'
import StatsTrend from '@/components/ui/StatsTrend'
import AchievementsShowcase from '@/components/ui/AchievementsShowcase'
import Leaderboard from '@/components/ui/Leaderboard'
import { Bell, Search, ChevronRight, TrendingUp, Target, Clock, Zap, Menu, BookOpen, Flame, Trophy, FileText } from 'lucide-react'
import BookCover from '@/components/ui/BookCover'
import { applyTheme, getTheme } from '@/lib/theme'

interface Book { id: string; title: string; author: string | null; cover_url?: string | null }
interface Session { book_id: string; progress_percent: number; updated_at: string; books: Book }
interface Profile {
  full_name: string | null; username: string | null; avatar_url: string | null
  streak_days: number; total_pages_read: number; xp: number; level: number
}

const GRADIENTS = [
  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
  'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
  'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
  'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
  'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
]

const DAILY_GOALS = [15, 30, 45, 60]

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [trending, setTrending] = useState<Book[]>([])
  const [newBooks, setNewBooks] = useState<Book[]>([])
  const [catalogBooks, setCatalogBooks] = useState<Book[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [dailyGoal, setDailyGoal] = useState(30)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [showGoalPicker, setShowGoalPicker] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [homeAnnouncement, setHomeAnnouncement] = useState<{ active: boolean; text: string }>({ active: false, text: '' })

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => {
    if (user) {
      fetchProfile(); fetchSessions(); fetchTrending(); fetchNewBooks(); fetchUnread(); fetchCatalog()
      fetchHomeSettings()
      const saved = localStorage.getItem('daily_goal')
      if (saved) setDailyGoal(Number(saved))
      const todayMins = localStorage.getItem(`today_mins_${new Date().toDateString()}`)
      if (todayMins) setTodayMinutes(Number(todayMins))
    }
  }, [user])

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    setProfile(data)
  }
  const fetchSessions = async () => {
    const { data } = await supabase.from('reading_sessions')
      .select('book_id, progress_percent, updated_at, books(*)')
      .eq('user_id', user!.id).gt('progress_percent', 0).lt('progress_percent', 100)
      .order('updated_at', { ascending: false }).limit(5)
    setSessions((data as any) || [])
  }
  const fetchTrending = async () => {
    const { data } = await supabase.from('books').select('*').eq('is_public', true)
      .order('rating_count', { ascending: false }).limit(8)
    setTrending(data || [])
  }
  const fetchNewBooks = async () => {
    const { data } = await supabase.from('books').select('*').eq('is_public', true)
      .order('created_at', { ascending: false }).limit(8)
    setNewBooks(data || [])
  }
  const fetchCatalog = async () => {
    const { data } = await supabase.from('catalog_books').select('id, title, author, cover_url')
      .eq('is_published', true).order('created_at', { ascending: false }).limit(8)
    setCatalogBooks((data as any) || [])
  }
  const fetchUnread = async () => {
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id).eq('is_read', false)
    setUnreadCount(count || 0)
  }

  const fetchHomeSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['user_announcement_active', 'user_announcement_banner'])

      const map = new Map((data || []).map(item => [item.key, item.value]))
      setHomeAnnouncement({
        active: map.get('user_announcement_active') === '1',
        text: map.get('user_announcement_banner') || '',
      })
    } catch {}
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 6) return 'Gece geç saatlerde 🌙'
    if (h < 12) return 'Günaydın 👋'
    if (h < 18) return 'İyi günler 👋'
    return 'İyi akşamlar 🌙'
  }

  const goalProgress = Math.min(100, (todayMinutes / dailyGoal) * 100)
  const xp = profile?.xp || 0
  const level = profile?.level || 1
  const levelProgress = (xp % 200) / 2

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px', width: '100%', maxWidth: '100%', overflowX: 'clip' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)',
        padding: '0 1rem', height: '54px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '-0.5px', color: 'var(--text)' }}>
          cognita
        </h1>
        <div style={{ display: 'flex', gap: '0.1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            <Search size={22} color="var(--text)" strokeWidth={1.8} />
          </button>
          <button onClick={() => router.push('/notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', position: 'relative' }}>
            <Bell size={22} color="var(--text)" strokeWidth={1.8} />
            {unreadCount > 0 && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: 'var(--red)', borderRadius: '50%', border: '2px solid var(--nav-bg)' }} />}
          </button>
          <button onClick={() => setShowDrawer(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            <Menu size={22} color="var(--text)" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Profil + Selam */}
      {homeAnnouncement.active && homeAnnouncement.text.trim() && (
        <div style={{ margin: '0.65rem 1rem 0', background: 'rgba(64,93,230,0.1)', border: '1px solid rgba(64,93,230,0.25)', borderRadius: '12px', padding: '0.7rem 0.85rem' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.2rem' }}>📢 Duyuru</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4 }}>{homeAnnouncement.text}</p>
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1rem 1rem 0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
          {/* Avatar */}
          <div onClick={() => router.push('/profile')} style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, overflow: 'hidden', border: '2px solid var(--border)' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>{(profile?.full_name || profile?.username || 'U')[0].toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{greeting()}</p>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
              {profile?.full_name?.split(' ')[0] || 'Okuyucu'}
            </h2>
          </div>
          {/* Streak badge */}
          {(profile?.streak_days || 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(234,88,12,0.1)', borderRadius: 999, padding: '0.3rem 0.7rem', border: '1px solid rgba(234,88,12,0.2)' }}>
              <Flame size={14} color="#ea580c" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ea580c' }}>{profile?.streak_days}</span>
            </div>
          )}
        </div>

        {/* XP / Level bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '5px', background: 'var(--bg-soft)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${levelProgress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 3, transition: 'width 1s ease' }} />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>Sv.{level} • {xp} XP</span>
        </div>
      </div>

      {/* İstatistik kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', margin: '0.75rem 1rem 0' }}>
        {[
          { icon: <Flame size={16} color="#ea580c" />, value: profile?.streak_days || 0, label: 'Seri', bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.15)' },
          { icon: <FileText size={16} color="var(--accent)" />, value: profile?.total_pages_read || 0, label: 'Sayfa', bg: 'rgba(64,93,230,0.08)', border: 'rgba(64,93,230,0.15)' },
          { icon: <Zap size={16} color="#f59e0b" />, value: xp, label: 'XP', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
          { icon: <Trophy size={16} color="#a855f7" />, value: `S${level}`, label: 'Seviye', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.15)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-md)', padding: '0.7rem 0.4rem', textAlign: 'center', border: `1px solid ${s.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.2rem' }}>{s.icon}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Günlük hedef */}
      <div style={{ margin: '0.75rem 1rem 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Target size={15} color="var(--accent)" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>Günlük Hedef</span>
          </div>
          <button onClick={() => setShowGoalPicker(!showGoalPicker)} style={{ background: 'rgba(64,93,230,0.1)', border: 'none', borderRadius: 999, padding: '0.2rem 0.7rem', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>
            {dailyGoal} dk
          </button>
        </div>
        {showGoalPicker && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
            {DAILY_GOALS.map(g => (
              <button key={g} onClick={() => { setDailyGoal(g); localStorage.setItem('daily_goal', String(g)); setShowGoalPicker(false) }}
                style={{ flex: 1, padding: '0.35rem', borderRadius: 8, border: `1.5px solid ${dailyGoal === g ? 'var(--accent)' : 'var(--border)'}`, background: dailyGoal === g ? 'rgba(64,93,230,0.1)' : 'transparent', color: dailyGoal === g ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                {g}dk
              </button>
            ))}
          </div>
        )}
        <div style={{ height: '7px', background: 'var(--bg-soft)', borderRadius: 4, overflow: 'hidden', marginBottom: '0.4rem' }}>
          <div style={{ height: '100%', width: `${goalProgress}%`, background: goalProgress >= 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{todayMinutes} / {dailyGoal} dakika</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: goalProgress >= 100 ? 'var(--green)' : 'var(--accent)' }}>
            {goalProgress >= 100 ? '🎉 Tamamlandı!' : `%${Math.round(goalProgress)}`}
          </span>
        </div>
      </div>

      {/* Günlük Alıntı */}
      <DailyQuote />

      {/* Dinamik Bannerlar */}
      {user && <DynamicBanners userId={user.id} />}

      {/* Hızlı Erişim Butonları */}
      <QuickActionButtons userId={user?.id} />

      {/* Senin İçin Önerilen */}
      {user && <RecommendedForYou userId={user.id} />}

      {/* Kaldığın Yerden */}
      {sessions.length > 0 && (
        <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} color="var(--accent)" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Kaldığın Yerden</span>
            </div>
            <button onClick={() => router.push('/library')} style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Tümü</button>
          </div>
          {sessions.map((s, i) => (
            <div key={s.book_id} onClick={() => router.push(`/reader/${s.book_id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.75rem 1rem', cursor: 'pointer', borderTop: '1px solid var(--border)' }}>
              <BookCover title={(s.books as any)?.title || ''} coverUrl={(s.books as any)?.cover_url} width={44} height={60} borderRadius={8} index={i} style={{ boxShadow: 'var(--shadow-md)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.1rem' }}>{(s.books as any)?.title}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.books as any)?.author || 'Yazar bilinmiyor'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: '3px', background: 'var(--bg-soft)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.progress_percent}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>%{Math.round(s.progress_percent)}</span>
                </div>
              </div>
              <div style={{ padding: '0.45rem 0.7rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', borderRadius: 10, color: 'white', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>Devam</div>
            </div>
          ))}
        </div>
      )}

      {/* Katalog - Klasikler */}
      {catalogBooks.length > 0 && (
        <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem 0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={15} color="#a855f7" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Klasik Eserler</span>
            </div>
            <button onClick={() => router.push('/catalog')} style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Tümü</button>
          </div>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.9rem', overflowX: 'auto', padding: '0 1rem 1rem' }}>
            {catalogBooks.map((book, i) => (
              <div key={book.id} onClick={() => router.push(`/catalog/${book.id}`)} style={{ flexShrink: 0, width: '100px', cursor: 'pointer' }}>
                <BookCover title={book.title} coverUrl={book.cover_url} width={100} height={140} borderRadius={10} index={i} style={{ marginBottom: '0.4rem', boxShadow: 'var(--shadow-md)' }} />
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                {book.author && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktif Zorluklar */}
      {user && <ChallengesSection userId={user.id} />}

      {/* Kategorilere Göre Keşfet */}
      <ExploreByCategory userId={user?.id} />

      {/* Haftalık İstatistikler */}
      {user && <StatsTrend userId={user.id} />}

      {/* Başarılar Vitrin */}
      {user && <AchievementsShowcase userId={user.id} />}

      {/* Sosyal Aktiviteleri */}
      {user && <SocialActivityFeed userId={user.id} />}

      {/* Liderlik Tablosu */}
      {user && <Leaderboard userId={user.id} />}

      {/* Yeni Eklenenler */}
      {newBooks.length > 0 && (
        <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem 0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap size={15} color="#f59e0b" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Topluluktan</span>
            </div>
            <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Tümü</button>
          </div>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.9rem', overflowX: 'auto', padding: '0 1rem 1rem' }}>
            {newBooks.map((book, i) => (
              <div key={book.id} onClick={() => router.push(`/book/${book.id}`)} style={{ flexShrink: 0, width: '100px', cursor: 'pointer' }}>
                <BookCover title={book.title} coverUrl={book.cover_url} width={100} height={140} borderRadius={10} index={i} style={{ marginBottom: '0.4rem', boxShadow: 'var(--shadow-md)' }} />
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                {book.author && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend */}
      {trending.length > 0 && (
        <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem 0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={15} color="var(--red)" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Trend</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {trending.slice(0, 5).map((book, i) => (
              <div key={book.id} onClick={() => router.push(`/book/${book.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.65rem 1rem', borderTop: i > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: i < 3 ? 'var(--accent)' : 'var(--border)', width: '20px', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                <BookCover title={book.title} coverUrl={book.cover_url} width={38} height={52} borderRadius={6} index={i} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{book.author || 'Yazar bilinmiyor'}</p>
                </div>
                <ChevronRight size={15} color="var(--border)" />
              </div>
            ))}
          </div>
        </div>
      )}

      <SideDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        profile={profile}
      />
      <BottomNav />
    </main>
  )
}
