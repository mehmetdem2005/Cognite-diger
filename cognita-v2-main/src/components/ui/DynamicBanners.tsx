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

  const getBannerClasses = (type: string) => {
    const baseClasses = 'p-4 rounded-lg mb-3 flex items-center gap-3 relative overflow-hidden border border-transparent'

    switch (type) {
      case 'streak_warning':
        return `${baseClasses} bg-orange-500/10 border-orange-500/20`
      case 'congratulations':
        return `${baseClasses} bg-green-500/10 border-green-500/20`
      case 'seasonal':
        return `${baseClasses} bg-purple-500/10 border-purple-500/20`
      case 'promotion':
        return `${baseClasses} bg-blue-500/10 border-blue-500/20`
      default:
        return baseClasses
    }
  }

  if (loading || visibleBanners.length === 0) return null

  return (
    <div className="mt-3">
      {visibleBanners.map(banner => (
        <div key={banner.id} className={getBannerClasses(banner.banner_type)}>
          {/* Icon */}
          <div className="text-2xl flex-shrink-0">{banner.icon}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-text mb-0.5">
              {banner.title}
            </h3>
            {banner.message && (
              <p className="text-xs text-text-muted">
                {banner.message}
              </p>
            )}
          </div>

          {/* CTA */}
          {banner.cta_text && banner.cta_link && (
            <button
              onClick={() => router.push(banner.cta_link!)}
              className="btn-primary text-xs px-2 py-1 flex-shrink-0 hover:scale-102 hover:shadow-md transition-all"
            >
              {banner.cta_text}
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={() => dismissBanner(banner.id)}
            className="bg-transparent border-none cursor-pointer text-text-muted p-0.5 flex items-center justify-center flex-shrink-0 hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
