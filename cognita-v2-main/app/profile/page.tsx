'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { Settings, Target, Calendar, BarChart2, ShieldCheck } from 'lucide-react'
import { getAdminByUserId } from '@/lib/adminAuth'
import BookCover from '@/components/ui/BookCover'

interface Profile {
  full_name: string | null; username: string | null; bio: string | null
  avatar_url: string | null
  streak_days: number; total_pages_read: number; xp: number; level: number
}
interface Book { id: string; title: string; author: string | null; total_pages: number }
interface Session { book_id: string; progress_percent: number; current_page: number; books: Book }
interface Challenge { id: string; title: string; description: string; goal_pages: number; goal_books: number; end_date: string }
interface LeaderProfile { full_name: string | null; username: string | null; xp: number; streak_days: number; total_pages_read: number }

const BADGES = [
  { icon: '📖', title: 'İlk Adım', check: (_: Profile, b: number) => b >= 1 },
  { icon: '🔥', title: '3 Gün Seri', check: (p: Profile) => p.streak_days >= 3 },
  { icon: '⚡', title: 'Haftalık', check: (p: Profile) => p.streak_days >= 7 },
  { icon: '🌟', title: 'Aylık', check: (p: Profile) => p.streak_days >= 30 },
  { icon: '📚', title: '100 Sayfa', check: (p: Profile) => p.total_pages_read >= 100 },
  { icon: '🏆', title: '500 Sayfa', check: (p: Profile) => p.total_pages_read >= 500 },
  { icon: '💎', title: 'Elit', check: (p: Profile) => p.total_pages_read >= 1000 },
  { icon: '🚀', title: 'Hızlı Okur', check: (p: Profile) => p.xp >= 500 },
]

const GRADIENTS = [
  'linear-gradient(135deg,#667EEA,#764BA2)',
  'linear-gradient(135deg,#F093FB,#F5576C)',
  'linear-gradient(135deg,#4FACFE,#00F2FE)',
  'linear-gradient(135deg,#43E97B,#38F9D7)',
]

const COLORS = [
  'linear-gradient(135deg,#405DE6,#833AB4)',
  'linear-gradient(135deg,#E8A430,#E63946)',
  'linear-gradient(135deg,#43E97B,#405DE6)',
]

const MEDALS = ['🥇', '🥈', '🥉']

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [bookCount, setBookCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'books'|'badges'|'challenges'|'leaderboard'>('books')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [joining, setJoining] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderProfile[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) { fetchData(); checkAdmin() } }, [user])

  const checkAdmin = async () => {
    const a = await getAdminByUserId(user!.id)
    setIsAdmin(!!a)
  }

  const fetchData = async () => {
    let { data: p } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    if (!p) {
      const { data: newP } = await supabase
        .from('profiles')
        .upsert({ id: user!.id, email: user!.email || '', full_name: user!.user_metadata?.full_name || null, username: user!.user_metadata?.username || null })
        .select().single()
      p = newP
    }
    if (!p) {
      p = { full_name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Kullanıcı', username: user!.user_metadata?.username || null, bio: null, avatar_url: null, streak_days: 0, total_pages_read: 0, xp: 0, level: 1 } as any
    }
    setProfile(p)
    const { count: bc } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('user_id', user!.id)
    setBookCount(bc || 0)
    const { data: s } = await supabase.from('reading_sessions').select('*, books(*)').eq('user_id', user!.id).gt('progress_percent', 0).order('updated_at', { ascending: false }).limit(4)
    setSessions((s as any) || [])
    const { count: fc } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user!.id)
    setFollowerCount(fc || 0)
    const { count: fgc } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user!.id)
    setFollowingCount(fgc || 0)
    fetchChallenges()
    fetchLeaderboard()
  }

  const fetchChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('is_active', true)
    if (data?.length) { setChallenges(data); }
    else {
      setChallenges([
        { id: '1', title: '30 Günde 500 Sayfa', description: 'Bu ay 500 sayfa oku!', goal_pages: 500, goal_books: 0, end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString() },
        { id: '2', title: '5 Kitap Challenge', description: 'Bu ay 5 kitap bitir!', goal_pages: 0, goal_books: 5, end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString() },
        { id: '3', title: 'Haftalık Okuma', description: 'Bu hafta 140 sayfa oku', goal_pages: 140, goal_books: 0, end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString() },
      ])
    }
    const { data: j } = await supabase.from('challenge_participants').select('challenge_id').eq('user_id', user!.id)
    setJoined(new Set(j?.map((d: any) => d.challenge_id) || []))
  }

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('profiles').select('full_name, username, xp, streak_days, total_pages_read').order('xp', { ascending: false }).limit(20)
    setLeaderboard(data || [])
  }

  const handleJoin = async (challengeId: string) => {
    setJoining(challengeId)
    try { await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: user!.id }) } catch {}
    setJoined(prev => { const n = new Set(Array.from(prev)); n.add(challengeId); return n })
    setJoining(null)
  }

  const getDaysLeft = (endDate: string) => Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000*60*60*24)))

  const xp = profile?.xp || 0
  const level = profile?.level || 1
  const levelProgress = (xp % 200) / 2

  if (loading || !user || !profile) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>@{profile.username}</h1>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button onClick={() => router.push('/stats')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem' }}>
            <BarChart2 size={22} color="var(--text)" strokeWidth={1.8} />
          </button>
          <button onClick={() => router.push('/settings')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem' }}>
            <Settings size={22} color="var(--text)" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <div style={{ padding: '1.25rem 1rem 0' }}>
        {/* Profil bilgisi */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#405DE6,#833AB4,#C13584)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'white', fontWeight: 700, flexShrink: 0, overflow: 'hidden', border: '2px solid var(--border)' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as any).style.display='none' }} />
              : profile.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
              {[{ value: bookCount, label: 'Kitap' }, { value: followerCount, label: 'Takipçi' }, { value: followingCount, label: 'Takip' }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.15rem' }}>{profile.full_name}</h2>
            {profile.bio && <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', lineHeight: 1.4 }}>{profile.bio}</p>}
          </div>
        </div>

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button onClick={() => router.push('/settings')} style={{ flex: 1, padding: '0.55rem', background: 'var(--bg-soft)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', color: 'var(--text)' }}>Profili Düzenle</button>
          {isAdmin && <button onClick={() => router.push('/admin')} style={{ flex: 1, padding: '0.55rem', background: 'rgba(64,93,230,0.1)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}><ShieldCheck size={15} /> Admin</button>}
          <button onClick={() => router.push(`/user/${profile.username}`)} style={{ flex: 1, padding: '0.55rem', background: 'var(--bg-soft)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', color: 'var(--text)' }}>Profilimi Gör</button>
        </div>

        {/* Seviye kartı */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '1rem', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🏅</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>Seviye {level}</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>{xp} XP</span>
          </div>
          <div style={{ height: '6px', background: 'var(--bg-soft)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.3rem' }}>
            <div style={{ height: '100%', width: `${levelProgress}%`, background: 'linear-gradient(90deg,#405DE6,#833AB4,#C13584)', borderRadius: '3px', transition: 'width 1s ease' }} />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sonraki seviye için {200 - (xp % 200)} XP</p>
        </div>

        {/* İstatistikler */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {[{ icon: '🔥', value: profile.streak_days, label: 'Günlük Seri' }, { icon: '📄', value: profile.total_pages_read, label: 'Okunan Sayfa' }].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sekmeler */}
      <div style={{ display: 'flex', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, overflowX: 'auto' }} className="hide-scrollbar">
        {[
          { id: 'books', label: '📚 Kitaplar' },
          { id: 'badges', label: '🏅 Rozetler' },
          { id: 'challenges', label: '⚡ Challenge' },
          { id: 'leaderboard', label: '🏆 Sıralama' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ flex: 1, padding: '0.75rem 0.5rem', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {tab.label}
          </button>
        ))}
      </div><div style={{ padding: '1rem' }}>
        {/* Kitaplar */}
        {activeTab === 'books' && (
          sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <p className="empty-state-title">Henüz kitap yok</p>
              <button onClick={() => router.push('/library')} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem' }}>Kitap Ekle</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {sessions.map((s, i) => (
                <div key={s.book_id} onClick={() => router.push(`/reader/${s.book_id}`)} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '0.9rem', display: 'flex', gap: '0.75rem', cursor: 'pointer', border: '1px solid var(--border)', alignItems: 'center' }}>
                  <BookCover title={(s.books as any)?.title || ''} coverUrl={(s.books as any)?.cover_url} width={44} height={58} borderRadius={7} index={i} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.1rem' }}>{(s.books as any)?.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{(s.books as any)?.author || 'Yazar bilinmiyor'}</p>
                    <div style={{ height: '3px', background: 'var(--bg-soft)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.progress_percent}%`, background: s.progress_percent >= 100 ? '#43E97B' : 'linear-gradient(90deg,var(--accent),var(--accent-2))', borderRadius: '2px' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>%{Math.round(s.progress_percent)}</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Rozetler */}
        {activeTab === 'badges' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {BADGES.map((b, i) => {
              const unlocked = b.check(profile, bookCount)
              return (
                <div key={i} style={{ textAlign: 'center', opacity: unlocked ? 1 : 0.3 }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.3rem', filter: unlocked ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 600, color: unlocked ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.2 }}>{b.title}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Challenge */}
        {activeTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {challenges.map((ch, i) => {
              const isJoined = joined.has(ch.id)
              const daysLeft = getDaysLeft(ch.end_date)
              return (
                <div key={ch.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ height: '5px', background: COLORS[i % COLORS.length] }} />
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>{ch.title}</h3>
                      {isJoined && <span className="tag tag-green" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>✓ Katıldın</span>}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{ch.description}</p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {ch.goal_pages > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-soft)' }}><Target size={12} color="var(--accent)" /> {ch.goal_pages} sayfa</div>}
                      {ch.goal_books > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>📚 {ch.goal_books} kitap</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: daysLeft <= 3 ? 'var(--red)' : 'var(--text-soft)' }}>
                        <Calendar size={12} /> {daysLeft} gün kaldı
                      </div>
                    </div>
                    {!isJoined ? (
                      <button onClick={() => handleJoin(ch.id)} disabled={joining === ch.id} style={{ width: '100%', padding: '0.65rem', background: COLORS[i % COLORS.length], border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                        {joining === ch.id ? 'Katılıyor...' : "⚡ Katıl"}
                      </button>
                    ) : (
                      <div style={{ padding: '0.5rem', background: 'var(--bg-soft)', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Okuma sayfalarından takip ediliyor 📖
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Sıralama */}
        {activeTab === 'leaderboard' && (
          leaderboard.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <p className="empty-state-title">Henüz kimse yok</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
                {[1, 0, 2].map(pos => {
                  const p = leaderboard[pos]
                  if (!p) return <div key={pos} />
                  const displayPos = pos === 1 ? 1 : pos === 0 ? 0 : 2
                  const heights = ['100px', '125px', '85px']
                  return (
                    <div key={pos} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{MEDALS[displayPos]}</div>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: COLORS[displayPos], display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.4rem', fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>
                        {p.full_name?.[0] || '?'}
                      </div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username || 'anonim'}</p>
                      <div style={{ height: heights[displayPos], background: COLORS[displayPos], borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.4rem' }}>
                        <div>
                          <p style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{p.xp}</p>
                          <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)' }}>XP</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {leaderboard.slice(3).map((p, i) => (
                <div key={i} className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', width: '20px', textAlign: 'center', flexShrink: 0 }}>{i + 4}</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                    {p.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name || p.username}</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🔥 {p.streak_days} gün</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📄 {p.total_pages_read} sayfa</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent)' }}>{p.xp}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>XP</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <BottomNav />
    </main>
  )
}
