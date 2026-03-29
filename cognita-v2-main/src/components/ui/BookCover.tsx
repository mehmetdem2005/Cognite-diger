const GRADIENTS = [
  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
  'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
  'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
  'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
  'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
  'linear-gradient(135deg, #FEE140 0%, #FA709A 100%)',
  'linear-gradient(135deg, #30CFD0 0%, #330867 100%)',
]

function gradientIndex(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) & 0xffff
  return hash % GRADIENTS.length
}

interface BookCoverProps {
  title: string
  coverUrl?: string | null
  width: number
  height: number
  borderRadius?: string | number
  style?: React.CSSProperties
  /** override gradient index (e.g. loop index). if omitted, derived from title */
  index?: number
}

export default function BookCover({ title, coverUrl, width, height, borderRadius = 8, style, index }: BookCoverProps) {
  const safeTitle = title || 'Bilinmeyen Kitap'
  const gi = index !== undefined ? index % GRADIENTS.length : gradientIndex(safeTitle)
  const initials = safeTitle.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
  const shortTitle = safeTitle.length > 16 ? safeTitle.slice(0, 16) + '…' : safeTitle
  const fontSize = Math.max(width * 0.18, 10)
  const subFontSize = Math.max(width * 0.075, 7)

  return (
    <div
      className="flex-shrink-0 relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        width,
        height,
        borderRadius,
        background: GRADIENTS[gi],
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        ...style,
      }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <>
          <span
            className="font-black text-white leading-none select-none"
            style={{
              fontSize,
              textShadow: '0 1px 6px rgba(0,0,0,0.4)',
            }}
          >
            {initials}
          </span>
          <span
            className="font-bold text-center select-none overflow-hidden line-clamp-2"
            style={{
              fontSize: subFontSize,
              color: 'rgba(255,255,255,0.82)',
              padding: '0 4px',
              marginTop: 3,
              lineHeight: 1.2,
            }}
          >
            {shortTitle}
          </span>
        </>
      )}
    </div>
  )
}
