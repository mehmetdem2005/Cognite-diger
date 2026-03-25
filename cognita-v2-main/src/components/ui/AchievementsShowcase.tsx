'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Lock } from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  requirement_type: string
  requirement_value: number
}

interface Props {
  userId: string
}

export default function AchievementsShowcase({ userId }: Props) {
  const router = useRouter()
  const [unlocked, setUnlocked] = useState<Achievement[]>([])
  const [locked, setLocked] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await fetch(`/api/achievements?userId=${userId}`)
        const data = await res.json()
        setUnlocked(data.unlocked?.map((a: any) => a.achievement) || [])
        setLocked(data.locked || [])
      } catch (error) {
        console.error('Failed to fetch achievements:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchAchievements()
  }, [userId])

  if (loading) return null

  return (
    <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Trophy size={15} color="#a855f7" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Başarılar</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {unlocked.length}/{unlocked.length + locked.length}
        </span>
      </div>

      {/* Açılı Başarılar */}
      {unlocked.length > 0 && (
        <div style={{ padding: '0 1rem 0.75rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Kazanılan Rozetler
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
            {unlocked.slice(0, 8).map(achievement => (
              <div
                key={achievement.id}
                title={achievement.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.6rem',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>{achievement.icon}</div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>
                  {achievement.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kilitli Başarılar */}
      {locked.length > 0 && (
        <div style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Yaklaşan Rozetler
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
            {locked.slice(0, 4).map(achievement => (
              <div
                key={achievement.id}
                title={`${achievement.title} - ${achievement.requirement_value} ${achievement.requirement_type}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.6rem',
                  background: 'rgba(153,153,153,0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(153,153,153,0.2)',
                  opacity: 0.6,
                  cursor: 'not-allowed'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: '1.3rem', opacity: 0.4 }}>{achievement.icon}</div>
                  <Lock size={12} color="var(--text-muted)" style={{ position: 'absolute', bottom: -4, right: -4 }} />
                </div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2, marginTop: '0.2rem' }}>
                  {achievement.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
