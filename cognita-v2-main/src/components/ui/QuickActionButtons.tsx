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
    <div className="grid grid-cols-3 gap-3 m-[0.75rem_1rem_0]">
      {buttons.map((btn, i) => {
        const Icon = btn.icon
        return (
          <button
            key={i}
            onClick={btn.onClick}
            title={btn.tooltip}
            className="flex flex-col items-center justify-center p-[1.2rem_0.75rem] border-none rounded-lg cursor-pointer text-white font-bold text-xs whitespace-pre-line text-center transition-all duration-300 relative overflow-hidden hover:scale-105 hover:shadow-2xl"
            style={{
              background: btn.color,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {/* Shine effect */}
            <div
              className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none transition-left duration-500"
              onMouseEnter={(e) => {
                e.currentTarget.style.left = '100%'
              }}
            />

            <Icon size={24} className="mb-1 relative z-10" />
            <span className="relative z-10 leading-tight">{btn.label}</span>
          </button>
        )
      })}
    </div>
  )
}
