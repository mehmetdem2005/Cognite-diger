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
      <div
        style={{
          flex: 1,
          background: 'var(--bg-soft)',
          borderRadius: 'var(--radius-md)',
          padding: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
          <Icon size={16} color="var(--accent)" style={{ marginRight: '0.3rem' }} />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title}</p>
        </div>

        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.3rem' }}>
          {value}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.2rem' }}>{unit}</span>
        </p>

        {change !== 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: isPositive ? 'var(--green)' : 'var(--red)'
            }}
          >
            {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(change)} {unit || 'artış'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1rem 1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <TrendingUp size={15} color="var(--accent)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Haftalık İstatistikler</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Geçen haftaya kıyasla</span>
      </div>

      {/* İstatistik Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
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

      {/* Ek İstatistikler */}
      <div style={{ background: 'var(--bg-soft)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Okuma Günleri</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{stats.current.reading_days}</p>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Ortalama Okuma</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
            {stats.current.avg_reading_time_minutes}
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.2rem' }}>dk</span>
          </p>
        </div>
        <div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Toplam XP</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{stats.current.total_xp_earned}</p>
        </div>
      </div>
    </div>
  )
}
