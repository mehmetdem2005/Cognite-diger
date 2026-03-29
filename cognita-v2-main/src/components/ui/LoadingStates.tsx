'use client'

/**
 * Loading Skeleton States
 * Shimmer animations for better perceived performance
 */

export function SkeletonCard() {
  return (
    <div className="skeleton w-full rounded-lg p-4" style={{ height: '120px', background: 'var(--bg-soft)' }} />
  )
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: '12px',
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="skeleton rounded"
        style={{ width: '100px', height: '140px' }}
      />
      <div className="skeleton rounded" style={{ height: '12px', width: '80%' }} />
      <div className="skeleton rounded" style={{ height: '10px', width: '60%' }} />
    </div>
  )
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="skeleton w-8 h-8 rounded-full" />
      <div className="flex-1">
        <div className="skeleton h-3 mb-2" style={{ width: '60%' }} />
        <div className="skeleton h-2" style={{ width: '40%' }} />
      </div>
      <div className="skeleton w-12 h-6 rounded" />
    </div>
  )
}

export function AchievementSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <div className="skeleton w-12 h-12 rounded-lg" />
      <div className="skeleton h-2 w-16 rounded" />
    </div>
  )
}

/**
 * Empty States
 * Beautiful empty state components
 */

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state py-8">
      <div className="empty-state-icon text-4xl mb-3">{icon}</div>
      <h3 className="empty-state-title text-base font-semibold mb-1">{title}</h3>
      <p className="empty-state-desc text-sm mb-4">{description}</p>
      {action && (
        <button className="btn-primary text-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function EmptyBooks() {
  return (
    <EmptyState
      icon="📚"
      title="Kitap Yokmuş"
      description="Henüz hiç kitap okumamışsınız. Biraz kendini geliştir!"
      action={{ label: "Kitap Bul", onClick: () => {} }}
    />
  )
}

export function EmptyActivities() {
  return (
    <EmptyState
      icon="✨"
      title="Hiç Aktivite Yok"
      description="Takip ettiğiniz kullanıcıların aktivitelerini burada göreceksiniz."
    />
  )
}

export function EmptyAchievements() {
  return (
    <EmptyState
      icon="🏆"
      title="Başarı Henüz Yok"
      description="Okumaya başla ve rozetler kazanmaya başla!"
    />
  )
}

export function EmptyLeaderboard() {
  return (
    <EmptyState
      icon="🏅"
      title="Liderlik Tablosu"
      description="Yeterince veri yok. Biraz daha beklenin..."
    />
  )
}

/**
 * Loading Spinner
 */

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div
        className="animate-spin"
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--accent-primary)',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}

/**
 * Page Loading State
 */

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div
          className="animate-spin"
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--bg-soft)',
            borderTop: '4px solid var(--accent-primary)',
            borderRadius: '50%',
          }}
        />
        <p className="text-sm text-text-muted">Yükleniyor...</p>
      </div>
    </div>
  )
}
