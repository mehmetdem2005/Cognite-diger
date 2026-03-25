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
    <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Users size={15} color="var(--accent)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Takip Ettikleriniz</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {activities.map((activity, i) => (
          <div
            key={activity.id}
            onClick={() => router.push(`/user/${activity.user.username}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              padding: '0.75rem 1rem',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-soft)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Avatar */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {activity.user.avatar_url ? (
                <img
                  src={activity.user.avatar_url}
                  alt={activity.user.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                  {(activity.user.full_name || activity.user.username || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Aktivite Metni */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 700 }}>{activity.user.full_name || activity.user.username}</span>
                {' '}
                {getActivityMessage(activity)}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {new Date(activity.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>

            {/* İkon */}
            {getActivityIcon(activity.activity_type)}
          </div>
        ))}
      </div>
    </div>
  )
}
