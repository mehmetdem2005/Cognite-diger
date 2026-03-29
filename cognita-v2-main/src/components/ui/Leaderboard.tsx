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
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `${rank}.`
    }
  }

  if (loading) return null

  return (
    <section className="card animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-red-500" />
          <h3 className="text-sm font-bold text-text-primary">Liderlik Tablosu</h3>
        </div>

        <div className="flex gap-1">
          {['weekly', 'monthly'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-2 py-1 rounded font-semibold transition-all ${
                period === p ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {p === 'weekly' ? 'Hafta' : 'Ay'}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border">
        {leaderboard.map((entry) => (
          <div
            key={entry.id}
            onClick={() => router.push(`/user/${entry.user.username}`)}
            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
              userRank?.user_id === entry.user_id
                ? 'bg-blue-500/10'
                : 'hover:bg-bg-soft'
            }`}
          >
            <div className="w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {entry.rank <= 3 ? getMedalEmoji(entry.rank) : `#${entry.rank}`}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {entry.user.full_name || entry.user.username}
              </p>
              <p className="text-xs text-text-muted">{entry.pages_read} sayfa</p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-accent-primary">{entry.xp_earned}⭐</p>
            </div>
          </div>
        ))}
      </div>

      {userRank && userRank.rank > 8 && (
        <div className="flex items-center gap-3 p-3 border-t-2 border-accent-primary bg-blue-50/50 dark:bg-blue-950/20">
          <span className="text-lg font-bold text-accent-primary flex-shrink-0">#{userRank.rank}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Senin Sıranız</p>
            <p className="text-xs text-text-muted">{userRank.pages_read} sayfa</p>
          </div>
          <p className="text-sm font-bold text-accent-primary flex-shrink-0">{userRank.xp_earned}⭐</p>
        </div>
      )}
    </section>
  )
}
