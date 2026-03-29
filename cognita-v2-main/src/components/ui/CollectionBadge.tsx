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
      className="inline-flex items-center gap-1 bg-bg-soft text-text border border-border rounded-full p-[0.3rem_0.7rem] text-xs hover:bg-border transition-colors"
    >
      <span>{icon}</span>
      <span>{name}</span>
      <span className="text-text-muted">({count})</span>
    </button>
  )
}
