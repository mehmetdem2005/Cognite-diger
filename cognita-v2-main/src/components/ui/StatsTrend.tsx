'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'

interface StatsData {
  current: {
    pages_read: number
    books_finished: number
    reading_days: number
    avg_reading_time_minutes: number
    total_xp_earned: number
  }
  previous: {
    pages_read: number
    books_finished: number
    reading_days: number
  }
  comparison: {
    pagesReadChange: number
    booksReadChange: number
    xpChange: number
  }
}

interface Props {
  userId: string
}

export default function StatsTrend({ userId }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/stats?userId=${userId}&type=weekly`)
        const data = await res.json()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchStats()
  }, [userId])

  if (loading || !stats?.current) return null

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    unit = ''
  }: {
    title: string
    value: number
    change: number
    icon: any
    unit?: string
  }) => {
    const isPositive = change >= 0
    return (
      <div className="flex-1 bg-bg-soft rounded-md p-3 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center mb-1">
          <Icon size={16} className="text-accent mr-1" />
          <p className="text-xs text-text-muted uppercase">{title}</p>
        </div>

        <p className="text-lg font-black text-text mb-1">
          {value}
          <span className="text-xs text-text-muted ml-0.5">{unit}</span>
        </p>

        {change !== 0 && (
          <div
            className={`flex items-center gap-0.5 text-xs font-bold ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(change)} {unit || 'artış'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 bg-card border-t border-b border-border p-4 pt-0">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-1">
          <TrendingUp size={15} className="text-accent" />
          <span className="text-sm font-bold text-text">Haftalık İstatistikler</span>
        </div>
        <span className="text-xs text-text-muted">Geçen haftaya kıyasla</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 mb-4">
        <StatCard
          title="Sayfalar"
          value={stats.current.pages_read}
          change={stats.comparison.pagesReadChange}
          icon={TrendingUp}
          unit="sayfa"
        />
        <StatCard
          title="Kitaplar"
          value={stats.current.books_finished}
          change={stats.comparison.booksReadChange}
          icon={TrendingUp}
          unit="kitap"
        />
        <StatCard
          title="XP"
          value={stats.current.total_xp_earned}
          change={stats.comparison.xpChange}
          icon={TrendingUp}
          unit="XP"
        />
      </div>

      {/* Extra Stats */}
      <div className="bg-bg-soft rounded-md p-3 mb-4 flex justify-around text-center">
        <div>
          <p className="text-xs text-text-muted mb-1">Okuma Günleri</p>
          <p className="text-base font-bold text-text">{stats.current.reading_days}</p>
        </div>
        <div className="border-l border-r border-border px-4">
          <p className="text-xs text-text-muted mb-1">Ortalama Okuma</p>
          <p className="text-base font-bold text-text">
            {stats.current.avg_reading_time_minutes}
            <span className="text-xs text-text-muted ml-0.5">dk</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">Toplam XP</p>
          <p className="text-base font-bold text-text">{stats.current.total_xp_earned}</p>
        </div>
      </div>
    </div>
  )
}
