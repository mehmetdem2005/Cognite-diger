'use client'

type Props = {
  name: string
  count: number
  icon?: string
  onClick?: () => void
}

export default function CollectionBadge({ name, count, icon = '📚', onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'var(--bg-soft)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '0.3rem 0.7rem',
        fontSize: '0.78rem',
      }}
    >
      <span>{icon}</span>
      <span>{name}</span>
      <span style={{ color: 'var(--text-muted)' }}>({count})</span>
    </button>
  )
}
