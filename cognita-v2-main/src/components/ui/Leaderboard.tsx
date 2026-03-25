'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity } from 'lucide-react'

interface LeaderboardEntry {
  id: string
  user_id: string
  rank: number
  pages_read: number
  books_read: number
  xp_earned: number
  user: {
    id: string
    username: string
    full_name: string
    avatar_url: string
  }
}

interface Props {
  userId?: string
}

export default function Leaderboard({ userId }: Props) {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('weekly')

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard?period=${period}&limit=8`)
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])

        // Kullanıcının sıralamasını bul
        if (userId) {
          const userEntry = data.leaderboard?.find((e: any) => e.user_id === userId)
          setUserRank(userEntry)
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [period, userId])

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `${rank}.`
    }
  }

  if (loading) return null

  return (
    <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Activity size={15} color="var(--red)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Liderlik Tablosu</span>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['weekly', 'monthly'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                fontSize: '0.7rem',
                padding: '0.3rem 0.7rem',
                border: `1px solid ${period === p ? 'var(--accent)' : 'var(--border)'}`,
                background: period === p ? 'rgba(64,93,230,0.1)' : 'transparent',
                color: period === p ? 'var(--accent)' : 'var(--text-muted)',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              {p === 'weekly' ? 'Haftalık' : 'Aylık'}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {leaderboard.map((entry, i) => (
          <div
            key={entry.id}
            onClick={() => router.push(`/user/${entry.user.username}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              padding: '0.8rem 1rem',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              background: userRank?.user_id === entry.user_id ? 'rgba(64,93,230,0.08)' : 'transparent'
            }}
            onMouseEnter={(e) => {
              if (userRank?.user_id !== entry.user_id) {
                e.currentTarget.style.background = 'var(--bg-soft)'
              }
            }}
            onMouseLeave={(e) => {
              if (userRank?.user_id !== entry.user_id) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            {/* Sıra */}
            <div
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: entry.rank <= 3 ? '1.2rem' : '0.9rem',
                fontWeight: 800,
                color: entry.rank <= 3 ? 'var(--accent)' : 'var(--text-muted)',
                flexShrink: 0
              }}
            >
              {getMedalEmoji(entry.rank)}
            </div>

            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              {entry.user.avatar_url ? (
                <img
                  src={entry.user.avatar_url}
                  alt={entry.user.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                  {(entry.user.full_name || entry.user.username || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* İsim ve İstatistik */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>
                {entry.user.full_name || entry.user.username}
                {userRank?.user_id === entry.user_id && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--accent)', marginLeft: '0.4rem', fontWeight: 700 }}>
                    (Siz)
                  </span>
                )}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {entry.pages_read} sayfa • {entry.xp_earned} XP
              </p>
            </div>

            {/* Puan */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.8rem',
                background: 'rgba(245,158,11,0.1)',
                borderRadius: 999,
                flexShrink: 0,
                border: '1px solid rgba(245,158,11,0.2)'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>⭐</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>
                {Math.round(entry.xp_earned / 10)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Kullanıcının Sıralaması (Değeri olmadığında) */}
      {userRank && !leaderboard.find(e => e.user_id === userRank.user_id) && (
        <>
          <div style={{ padding: '0.75rem 1rem', textAlign: 'center', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            ...
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              padding: '0.8rem 1rem',
              background: 'rgba(64,93,230,0.08)',
              borderTop: '1px solid var(--border)'
            }}
          >
            <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)' }}>
              {userRank.rank}.
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>SIZ</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Sizin Sıralama</p>
            </div>
            <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(245,158,11,0.1)', borderRadius: 999, border: '1px solid rgba(245,158,11,0.2)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>#{userRank.rank}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
