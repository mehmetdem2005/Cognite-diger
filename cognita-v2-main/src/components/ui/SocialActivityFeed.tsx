'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Users, BookOpen as BookIcon } from 'lucide-react'

interface Activity {
  id: string
  user_id: string
  user: {
    id: string
    full_name: string
    username: string
    avatar_url: string
  }
  activity_type: string
  activity_data: any
  created_at: string
}

interface Props {
  userId: string
}

export default function SocialActivityFeed({ userId }: Props) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`/api/social/activities?userId=${userId}&limit=8`)
        const data = await res.json()
        setActivities(data.activities || [])
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchActivities()
  }, [userId])

  const getActivityMessage = (activity: Activity) => {
    switch (activity.activity_type) {
      case 'started_book':
        return `${activity.activity_data?.book_title} kitabını okumaya başladı`
      case 'finished_book':
        return `${activity.activity_data?.book_title} kitabını bitirdi 🎉`
      case 'highlighted':
        return 'Bir pasajı vurguladi'
      case 'leveled_up':
        return `Seviye ${activity.activity_data?.new_level} oldu 🚀`
      default:
        return 'Bir aktivite yaptı'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'started_book':
      case 'finished_book':
        return <BookIcon size={14} color="var(--accent)" />
      case 'highlighted':
        return <Heart size={14} color="#ea580c" />
      case 'leveled_up':
        return <span>🚀</span>
      default:
        return <Users size={14} color="var(--accent)" />
    }
  }

  if (loading || activities.length === 0) return null

  return (
    <section className="card animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-500" />
          <h3 className="text-sm font-bold text-text-primary">Takip Ettikleriniz</h3>
        </div>
      </div>

      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <div
            key={activity.id}
            onClick={() => router.push(`/user/${activity.user.username}`)}
            className="flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-bg-soft"
          >
            {getActivityIcon(activity.activity_type) && (
              <div className="flex-shrink-0 text-lg">{getActivityIcon(activity.activity_type)}</div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {activity.user.full_name || activity.user.username}
              </p>
              <p className="text-xs text-text-muted line-clamp-2">{getActivityMessage(activity)}</p>
            </div>

            <p className="text-xs text-text-muted flex-shrink-0 whitespace-nowrap">
              {new Date(activity.created_at).toLocaleDateString('tr-TR')}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
