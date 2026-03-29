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
    <section className="card animate-fade-in">
      <div className="flex items-center  justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-purple-500" />
          <h3 className="text-sm font-bold text-text-primary">Başarılar</h3>
        </div>
        <span className="text-xs text-text-muted font-semibold">
          {unlocked.length}/{unlocked.length + locked.length}
        </span>
      </div>

      {unlocked.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Kazanılan Rozetler
          </p>
          <div className="grid grid-cols-auto-fit gap-2">
            {unlocked.slice(0, 8).map(achievement => (
              <div
                key={achievement.id}
                title={achievement.title}
                className="flex flex-col items-center justify-center p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-md"
              >
                <div className="text-lg mb-1">{achievement.icon}</div>
                <p className="text-xs font-bold text-text-primary text-center line-clamp-2">
                  {achievement.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div className={unlocked.length > 0 ? 'border-t border-border pt-4' : ''}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Kilitli Rozetler
          </p>
          <div className="grid grid-cols-auto-fit gap-2">
            {locked.slice(0, 4).map(achievement => (
              <div
                key={achievement.id}
                title={`${achievement.title} - ${achievement.requirement_value} ${achievement.requirement_type}`}
                className="flex flex-col items-center justify-center p-2 bg-gray-500/5 border border-gray-500/20 rounded-lg opacity-60 cursor-not-allowed"
              >
                <div className="relative">
                  <div className="text-lg opacity-40">{achievement.icon}</div>
                  <Lock size={10} className="absolute -bottom-1 -right-1 text-text-muted" />
                </div>
                <p className="text-xs font-bold text-text-muted text-center line-clamp-2 mt-1">
                  {achievement.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
