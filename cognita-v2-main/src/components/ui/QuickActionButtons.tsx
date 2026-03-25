'use client'
import { useRouter } from 'next/navigation'
import { Plus, Shuffle, Upload } from 'lucide-react'

interface Props {
  userId?: string
}

export default function QuickActionButtons({ userId }: Props) {
  const router = useRouter()

  const buttons = [
    {
      icon: Plus,
      label: 'Yeni Kitap\nBaşla',
      color: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
      onClick: () => router.push('/library'),
      tooltip: 'Kütüphanenizdeki herhangi bir kitapla başlayın'
    },
    {
      icon: Shuffle,
      label: 'Rastgele\nKitap',
      color: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
      onClick: () => router.push('/explore?random=true'),
      tooltip: 'Rastgele bir kitap keşfedin'
    },
    {
      icon: Upload,
      label: 'Kitap\nYükle',
      color: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
      onClick: () => router.push('/write'),
      tooltip: 'Yeni bir kitap veya yazı yükleyin'
    }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '0.75rem 1rem 0' }}>
      {buttons.map((btn, i) => {
        const Icon = btn.icon
        return (
          <button
            key={i}
            onClick={btn.onClick}
            title={btn.tooltip}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.2rem 0.75rem',
              background: btn.color,
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.8rem',
              whiteSpace: 'pre-line',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {/* Arka plan parlama efekti */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                transition: 'left 0.5s ease',
                pointerEvents: 'none'
              }}
              onMouseEnter={(e) => {
                const parent = e.currentTarget.parentElement
                if (parent) {
                  e.currentTarget.style.left = '100%'
                }
              }}
            />

            <Icon size={24} style={{ marginBottom: '0.4rem', position: 'relative', zIndex: 1 }} />
            <span style={{ position: 'relative', zIndex: 1, lineHeight: 1.2 }}>{btn.label}</span>
          </button>
        )
      })}
    </div>
  )
}
