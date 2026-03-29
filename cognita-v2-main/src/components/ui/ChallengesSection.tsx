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
    <section className="card animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-yellow-500" />
          <h3 className="text-sm font-bold text-text-primary">Aktif Zorluklar</h3>
        </div>
        <button onClick={() => router.push('/challenges')} className="btn-ghost text-xs">
          Tümü
        </button>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => {
          const progress = userProgress[challenge.id]
          const isParticipating = !!progress

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
              className={`card-soft cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
                isParticipating ? 'border-2 border-accent-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-text-primary mb-1">
                    {challenge.title}
                  </h4>
                  <p className="text-xs text-text-muted">
                    {challenge.description}
                  </p>
                </div>
                {isParticipating && (
                  <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                    Katıldın
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="w-full h-1 bg-bg-soft rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', borderRadius: 'inherit', transition: 'width 0.3s ease' }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-text-muted">{progressText}</p>
                  <span className="text-xs font-bold text-accent-primary">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
