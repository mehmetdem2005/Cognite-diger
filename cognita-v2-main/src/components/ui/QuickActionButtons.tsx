'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Plus, Shuffle, Upload } from 'lucide-react'
import { getStoredLocale, Locale, t } from '@/lib/i18n'

interface Props {
  userId?: string
}

export default function QuickActionButtons({ userId }: Props) {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>(() => (typeof window !== 'undefined' ? getStoredLocale() : 'tr'))

  useEffect(() => {
    const onLanguageChanged = () => setLocale(getStoredLocale())
    window.addEventListener('storage', onLanguageChanged)
    window.addEventListener('cognita-language-changed', onLanguageChanged)
    return () => {
      window.removeEventListener('storage', onLanguageChanged)
      window.removeEventListener('cognita-language-changed', onLanguageChanged)
    }
  }, [])

  const buttons = [
    {
      icon: Plus,
      label: t(locale, 'quickActionNewBook'),
      color: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
      onClick: () => router.push('/library'),
      tooltip: t(locale, 'quickActionNewBookHint')
    },
    {
      icon: Shuffle,
      label: t(locale, 'quickActionRandomBook'),
      color: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
      onClick: () => router.push('/explore?random=true'),
      tooltip: t(locale, 'quickActionRandomBookHint')
    },
    {
      icon: Upload,
      label: t(locale, 'quickActionUploadBook'),
      color: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
      onClick: () => router.push('/write'),
      tooltip: t(locale, 'quickActionUploadBookHint')
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
              padding: '1.4rem 0.8rem',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.8rem',
              whiteSpace: 'break-spaces',
              textAlign: 'center',
              lineHeight: 1.2,
              transition: 'all 300ms ease',
              position: 'relative',
              overflow: 'hidden',
              background: btn.color,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {/* Shine effect */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                pointerEvents: 'none',
                transition: 'left 500ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.left = '100%' }}
            />

            <Icon size={24} style={{ marginBottom: '0.4rem', position: 'relative', zIndex: 10 }} />
            <span style={{ position: 'relative', zIndex: 10 }}>{btn.label}</span>
          </button>
        )
      })}
    </div>
  )
}
