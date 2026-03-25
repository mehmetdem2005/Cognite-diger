'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { Target, Calendar } from 'lucide-react'

interface Challenge { id: string; title: string; description: string; goal_pages: number; goal_books: number; end_date: string }
interface Profile { full_name: string | null; username: string | null; xp: number; level: number; streak_days: number; total_pages_read: number }

export default function ChallengesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [joined, setJoined] = useState<string[]>([])
  const [leaderboard, setLeaderboard] = useState<Profile[]>([])
  const [activeTab, setActiveTab] = useState<'challenges'|'leaderboard'>('challenges')
  const [joining, setJoining] = useState<string | null>(null)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) { fetchChallenges(); fetchJoined(); fetchLeaderboard() } }, [user])

  const fetchChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('is_active', true)
    if (data?.length) { setChallenges(data); return }
    setChallenges([
      { id: '1', title: '30 Günde 500 Sayfa', description: 'Bu ay 500 sayfa oku ve rozetini kazan!', goal_pages: 500, goal_books: 0, end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString() },
      { id: '2', title: '5 Kitap Challenge', description: 'Bu ay 5 farklı kitap bitir!', goal_pages: 0, goal_books: 5, end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString() },
      { id: '3', title: 'Haftalık Okuma', description: 'Bu hafta her gün en az 20 sayfa oku', goal_pages: 140, goal_books: 0, end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString() },
    ])
  }

  const fetchJoined = async () => {
    const { data } = await supabase.from('challenge_participants').select('challenge_id').eq('user_id', user!.id)
    setJoined(data?.map((d: any) => d.challenge_id) || [])
  }

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('profiles').select('full_name, username, xp, level, streak_days, total_pages_read').order('xp', { ascending: false }).limit(20)
    setLeaderboard(data || [])
  }

  const handleJoin = async (challengeId: string) => {
    setJoining(challengeId)
    try {
      await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: user!.id })
    } catch {}
    setJoined(prev => [...prev, challengeId])
    setJoining(null)
  }

  const getDaysLeft = (endDate: string) => Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000*60*60*24)))

  const COLORS = ['linear-gradient(135deg,#405DE6,#833AB4)', 'linear-gradient(135deg,#E8A430,#E63946)', 'linear-gradient(135deg,#43E97B,#405DE6)']
  const MEDALS = ['🥇', '🥈', '🥉']

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0.9rem 1rem 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.75rem' }}>🏆 Yarışmalar</h1>
        <div style={{ display: 'flex' }}>
          {[{ id: 'challenges', label: '⚡ Challenge' }, { id: 'leaderboard', label: '🏅 Sıralama' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ flex: 1, padding: '0.6rem', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: '1rem' }}>
        {activeTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {challenges.map((ch, i) => {
              const isJoined = joined.includes(ch.id)
              const daysLeft = getDaysLeft(ch.end_date)
              return (
                <div key={ch.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ height: '6px', background: COLORS[i % COLORS.length] }} />
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>{ch.title}</h3>
                      {isJoined && <span className="tag tag-green" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>✓ Katıldın</span>}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{ch.description}</p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {ch.goal_pages > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-soft)' }}><Target size={13} color="var(--accent)" /> {ch.goal_pages} sayfa</div>}
                      {ch.goal_books > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>📚 {ch.goal_books} kitap</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: daysLeft <= 3 ? 'var(--red)' : 'var(--text-soft)' }}>
                        <Calendar size={13} /> {daysLeft} gün kaldı
                      </div>
                    </div>
                    {!isJoined ? (
                      <button onClick={() => handleJoin(ch.id)} disabled={joining === ch.id} style={{ width: '100%', padding: '0.7rem', background: COLORS[i % COLORS.length], border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>
                        {joining === ch.id ? 'Katılıyor...' : "⚡ Challenge'a Katıl"}
                      </button>
                    ) : (
                      <div style={{ padding: '0.6rem', background: 'var(--bg-soft)', borderRadius: '8px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Okuma sayfalarından ilerleme takip ediliyor 📖
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏆</div>
                <p className="empty-state-title">Henüz kimse yok</p>
                <p className="empty-state-desc">İlk okumayı sen başlat!</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
                  {[1, 0, 2].map(pos => {
                    const profile = leaderboard[pos]
                    if (!profile) return <div key={pos} />
                    const displayPos = pos === 1 ? 1 : pos === 0 ? 0 : 2
                    const heights = ['100px', '125px', '85px']
                    return (
                      <div key={pos} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{MEDALS[displayPos]}</div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: COLORS[displayPos], display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.4rem', fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>
                          {profile.full_name?.[0] || '?'}
                        </div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.username || 'anonim'}</p>
                        <div style={{ height: heights[displayPos], background: COLORS[displayPos], borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.4rem' }}>
                          <div>
                            <p style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{profile.xp}</p>
                            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)' }}>XP</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {leaderboard.slice(3).map((profile, i) => (
                  <div key={i} className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', width: '20px', textAlign: 'center', flexShrink: 0 }}>{i + 4}</span>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                      {profile.full_name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name || profile.username}</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🔥 {profile.streak_days} gün</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📄 {profile.total_pages_read} sayfa</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent)' }}>{profile.xp}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>XP</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
