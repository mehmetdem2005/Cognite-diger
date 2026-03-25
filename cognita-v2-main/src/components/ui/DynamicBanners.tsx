'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Banner {
  id: string
  title: string
  message: string
  banner_type: string
  icon: string
  cta_text?: string
  cta_link?: string
}

interface Props {
  userId: string
}

export default function DynamicBanners({ userId }: Props) {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch(`/api/banners?userId=${userId}`)
        const data = await res.json()
        setBanners(data.banners || [])
      } catch (error) {
        console.error('Failed to fetch banners:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchBanners()
  }, [userId])

  const visibleBanners = banners.filter(b => !dismissedBanners.has(b.id)).slice(0, 2)

  const dismissBanner = (id: string) => {
    const newSet = new Set(dismissedBanners)
    newSet.add(id)
    setDismissedBanners(newSet)
  }

  const getBannerStyles = (type: string) => {
    const baseStyle = {
      padding: '1rem',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      position: 'relative' as const,
      overflow: 'hidden',
      border: '1px solid transparent'
    }

    switch (type) {
      case 'streak_warning':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(234,88,12,0.1), rgba(234,88,12,0.05))',
          border: '1px solid rgba(234,88,12,0.2)'
        }
      case 'congratulations':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))',
          border: '1px solid rgba(34,197,94,0.2)'
        }
      case 'seasonal':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.05))',
          border: '1px solid rgba(168,85,247,0.2)'
        }
      case 'promotion':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(64,93,230,0.1), rgba(64,93,230,0.05))',
          border: '1px solid rgba(64,93,230,0.2)'
        }
      default:
        return baseStyle
    }
  }

  if (loading || visibleBanners.length === 0) return null

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {visibleBanners.map(banner => (
        <div key={banner.id} style={getBannerStyles(banner.banner_type)}>
          {/* Icon */}
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{banner.icon}</div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.2rem' }}>
              {banner.title}
            </h3>
            {banner.message && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {banner.message}
              </p>
            )}
          </div>

          {/* CTA */}
          {banner.cta_text && banner.cta_link && (
            <button
              onClick={() => router.push(banner.cta_link!)}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
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
              {banner.cta_text}
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={() => dismissBanner(banner.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
