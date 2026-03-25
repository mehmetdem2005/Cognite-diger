'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Home, BookOpen, Sparkles, Compass, User, Plus, PenTool, Search, Upload, BookMarked, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { interaction } from '@/lib/interaction'

const TABS = [
  { icon: Home, label: 'Anasayfa', href: '/home' },
  { icon: BookOpen, label: 'Kitaplık', href: '/library' },
  { icon: Plus, label: '', href: '__action__' }, // Orta — hızlı aksiyon
  { icon: Compass, label: 'Keşfet', href: '/explore' },
  { icon: User, label: 'Profil', href: '/profile' },
]

const QUICK_ACTIONS = [
  { icon: PenTool, label: 'Yazı Yaz', href: '/write', color: '#667EEA' },
  { icon: BookMarked, label: 'Katalog', href: '/catalog', color: '#A855F7' },
  { icon: Search, label: 'Ara', href: '/explore', color: '#11998e' },
  { icon: Upload, label: 'Kitap Ekle', href: '/library?upload=1', color: '#FA709A' },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isFlow = pathname.startsWith('/flow')

  const handleTab = (href: string) => {
    interaction.tap()
    if (href === '__action__') {
      setShowActions(v => !v)
      return
    }
    setShowActions(false)
    router.push(href)
  }

  return (
    <>
      {/* Hızlı aksiyon overlay */}
      {showActions && (
        <div
          onClick={() => setShowActions(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9990,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Hızlı aksiyon butonları */}
      {showActions && QUICK_ACTIONS.map((action, i) => {
        const Icon = action.icon
        const angle = -90 + (i - 1.5) * 45 // -157.5, -112.5, -67.5, -22.5
        const rad = (angle * Math.PI) / 180
        const dist = 90
        const x = Math.cos(rad) * dist
        const y = Math.sin(rad) * dist

        return (
          <div
            key={action.href}
            onClick={() => { setShowActions(false); router.push(action.href) }}
            style={{
              position: 'fixed',
              bottom: `calc(var(--nav-height) / 2)`,
              left: '50%',
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              zIndex: 9995,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.3rem',
              animation: `popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.04}s both`,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: action.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 20px ${action.color}60`,
              border: '2px solid rgba(255,255,255,0.3)',
            }}>
              <Icon size={22} color="white" strokeWidth={1.8} />
            </div>
            <span style={{
              fontSize: '0.62rem', fontWeight: 700, color: 'white',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              background: 'rgba(0,0,0,0.4)',
              padding: '0.1rem 0.4rem',
              borderRadius: 999,
              backdropFilter: 'blur(4px)',
            }}>
              {action.label}
            </span>
          </div>
        )
      })}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'var(--nav-height)',
        background: isFlow ? 'rgba(0,0,0,0.6)' : 'var(--nav-bg)',
        borderTop: `1px solid ${isFlow ? 'rgba(255,255,255,0.1)' : 'var(--nav-border)'}`,
        display: 'flex', alignItems: 'center', zIndex: 9999,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'background 0.3s ease',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {TABS.map((tab, idx) => {
          const Icon = tab.icon
          const isCenter = tab.href === '__action__'
          const active = !isCenter && pathname.startsWith(tab.href)
          const color = isFlow
            ? (active ? 'white' : 'rgba(255,255,255,0.45)')
            : (active ? 'var(--accent)' : 'var(--text-muted)')

          if (isCenter) {
            return (
              <button
                key="action"
                onClick={() => handleTab('__action__')}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0.4rem 0',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: showActions
                    ? 'var(--bg-soft)'
                    : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: showActions ? 'none' : '0 4px 16px rgba(64,93,230,0.4)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: showActions ? 'rotate(45deg) scale(0.95)' : 'rotate(0deg) scale(1)',
                }}>
                  <Plus size={20} color={showActions ? 'var(--text-muted)' : 'white'} strokeWidth={2.5} />
                </div>
              </button>
            )
          }

          return (
            <button
              key={tab.href}
              onClick={() => handleTab(tab.href)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '2px', background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '0.4rem 0', color,
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon
                  size={21}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ transition: 'transform 0.2s ease' }}
                />
                {active && (
                  <div style={{
                    position: 'absolute', bottom: -4, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: '50%',
                    background: isFlow ? 'white' : 'var(--accent)',
                  }} />
                )}
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: active ? 700 : 400 }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>

      <style>{`
        @keyframes popIn {
          from { transform: translate(calc(-50% + 0px), -50%) scale(0); opacity: 0; }
          to { transform: translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, 0px))) scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
 