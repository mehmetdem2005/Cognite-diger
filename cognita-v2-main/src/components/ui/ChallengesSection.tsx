'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap, TrendingUp } from 'lucide-react'

interface Challenge {
  id: string
  title: string
  description: string
  goal_pages: number
  goal_books: number
  goal_days: number
  start_date: string
  end_date: string
}

interface ChallengeParticipant {
  id: string
  challenge_id: string
  user_id: string
  pages_read: number
  books_read: number
}

interface Props {
  userId: string
}

export default function ChallengesSection({ userId }: Props) {
  const router = useRouter()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [userProgress, setUserProgress] = useState<Record<string, ChallengeParticipant>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const { data: activeChallenges } = await supabase
          .from('challenges')
          .select('*')
          .eq('is_active', true)
          .limit(3)

        setChallenges(activeChallenges || [])

        if (activeChallenges) {
          const { data: participants } = await supabase
            .from('challenge_participants')
            .select('*')
            .eq('user_id', userId)
            .in('challenge_id', activeChallenges.map(c => c.id))

          const progressMap: Record<string, ChallengeParticipant> = {}
          participants?.forEach(p => {
            progressMap[p.challenge_id] = p
          })
          setUserProgress(progressMap)
        }
      } catch (error) {
        console.error('Failed to fetch challenges:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchChallenges()
  }, [userId])

  if (loading || challenges.length === 0) return null

  return (
    <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Zap size={15} color="#f59e0b" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Aktif Zorluklar</span>
        </div>
        <button onClick={() => router.push('/challenges')} style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
          Tümü
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
        {challenges.map((challenge) => {
          const progress = userProgress[challenge.id]
          const isParticipating = !!progress

          // Progress hesapla
          let progressPercent = 0
          let progressText = ''

          if (challenge.goal_pages > 0) {
            progressPercent = Math.min(100, ((progress?.pages_read || 0) / challenge.goal_pages) * 100)
            progressText = `${progress?.pages_read || 0} / ${challenge.goal_pages} sayfa`
          } else if (challenge.goal_books > 0) {
            progressPercent = Math.min(100, ((progress?.books_read || 0) / challenge.goal_books) * 100)
            progressText = `${progress?.books_read || 0} / ${challenge.goal_books} kitap`
          }

          return (
            <div
              key={challenge.id}
              onClick={() => router.push('/challenges')}
              style={{
                background: 'var(--bg-soft)',
                borderRadius: 'var(--radius-md)',
                padding: '0.8rem',
                cursor: 'pointer',
                border: isParticipating ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.2rem' }}>
                    {challenge.title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    {challenge.description}
                  </p>
                </div>
                {isParticipating && (
                  <div style={{ background: 'rgba(245,158,11,0.2)', borderRadius: 999, padding: '0.2rem 0.6rem', marginLeft: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b' }}>Katılıyorum</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ flex: 1, height: '5px', background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: `linear-gradient(90deg, ${isParticipating ? 'var(--accent)' : 'var(--accent)'}, ${isParticipating ? 'var(--accent-2)' : 'var(--accent-2)'})`,
                      borderRadius: 3,
                      transition: 'width 0.5s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                  %{Math.round(progressPercent)}
                </span>
              </div>

              {/* Progress Text */}
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
                {progressText}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
