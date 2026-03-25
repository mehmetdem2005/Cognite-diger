'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  X, Home, BookOpen, Sparkles, Compass, User, Settings,
  BarChart2, Trophy, FolderOpen, Bell, Moon, Sun, Monitor,
  PenTool, Library, LogOut, Shield, Bookmark, Zap
} from 'lucide-react'
import { applyTheme, getTheme } from '@/lib/theme'
import { useAuth } from '@/lib/useAuth'
import { useState } from 'react'
import BookCover from '@/components/ui/BookCover'

interface Props {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
  profile?: {
    full_name?: string | null
    username?: string | null
    avatar_url?: string | null
    xp?: number
    level?: number
    streak_days?: number
  } | null
}

const MENU_ITEMS = [
  { icon: Home, label: 'Ana Sayfa', href: '/home', section: 'main' },
  { icon: BookOpen, label: 'Kitaplarım', href: '/library', section: 'main' },
  { icon: Sparkles, label: 'The Flow', href: '/flow', section: 'main' },
  { icon: Compass, label: 'Keşfet', href: '/explore', section: 'main' },
  { icon: Library, label: 'Katalog', href: '/catalog', section: 'main' },
  { icon: PenTool, label: 'Yazarlık Stüdyosu', href: '/write', section: 'create' },
  { icon: FolderOpen, label: 'Projelerim', href: '/projects', section: 'create' },
  { icon: Bookmark, label: 'Kaydettiklerim', href: '/library?tab=saved', section: 'create' },
  { icon: Trophy, label: 'Meydan Okumalar', href: '/challenges', section: 'social' },
  { icon: BarChart2, label: 'İstatistiklerim', href: '/stats', section: 'social' },
  { icon: Bell, label: 'Bildirimler', href: '/notifications', section: 'social' },
  { icon: User, label: 'Profilim', href: '/profile', section: 'account' },
  { icon: Settings, label: 'Ayarlar', href: '/settings', section: 'account' },
]

const SECTIONS = [
  { key: 'main', label: 'Keşfet' },
  { key: 'create', label: 'Üret' },
  { key: 'social', label: 'Topluluk' },
  { key: 'account', label: 'Hesap' },
]

export default function SideDrawer({ open, onClose, profile, isAdmin = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { signOut } = useAuth() as any
  const [theme, setTheme] = useState(() => typeof window !== 'undefined' ? getTheme() : 'light')
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleNav = (href: string) => {
    router.push(href)
    onClose()
  }

  const handleTheme = (t: string) => {
    setTheme(t)
    applyTheme(t)
  }

  const handleSignOut = async () => {
    await signOut?.()
    router.push('/auth/login')
    onClose()
  }

  const xpProgress = ((profile?.xp || 0) % 200) / 2

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0, bottom: 0, right: 0,
          width: 'min(320px, 85vw)',
          zIndex: 9999,
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
          boxShadow: open ? '-10px 0 30px rgba(0,0,0,0.15)' : 'none',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Üst profil alanı */}
        <div style={{
          padding: '3rem 1.25rem 1.25rem',
          background: 'linear-gradient(160deg, var(--accent) 0%, var(--accent-2) 100%)',
          position: 'relative',
        }}>
          {/* Kapat butonu */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: '50%',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
            }}
          >
            <X size={16} color="white" />
          </button>

          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.75rem',
            overflow: 'hidden',
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.5rem', color: 'white', fontWeight: 700 }}>
                {(profile?.full_name || profile?.username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>

          <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem', marginBottom: '0.15rem' }}>
            {profile?.full_name || profile?.username || 'Kullanıcı'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginBottom: '1rem' }}>
            @{profile?.username || 'anonim'} • Lv.{profile?.level || 1}
          </p>

          {/* XP bar */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.68rem', fontWeight: 600 }}>
                <Zap size={10} style={{ display: 'inline', marginRight: 3 }} />
                {profile?.xp || 0} XP
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>
                {200 - ((profile?.xp || 0) % 200)} sonraki seviye
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${xpProgress}%`,
                background: 'white',
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Streak */}
          {(profile?.streak_days || 0) > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '0.2rem 0.6rem', fontSize: '0.72rem', color: 'white' }}>
              🔥 {profile?.streak_days} günlük seri
            </div>
          )}
        </div>

        {/* Menü öğeleri */}
        <div style={{ flex: 1, padding: '0.75rem 0' }}>
          {SECTIONS.map(section => {
            const items = MENU_ITEMS.filter(i => i.section === section.key)
            return (
              <div key={section.key}>
                <p style={{ padding: '0.5rem 1.25rem 0.3rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {section.label}
                </p>
                {items.map(item => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.href.split('?')[0])
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNav(item.href)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        gap: '0.75rem', padding: '0.7rem 1.25rem',
                        background: active ? 'rgba(64,93,230,0.08)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={18} color={active ? 'var(--accent)' : 'var(--text-soft)'} strokeWidth={active ? 2.5 : 1.8} />
                      <span style={{ fontSize: '0.88rem', fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--text)' }}>
                        {item.label}
                      </span>
                    </button>
                  )
                })}
                <div style={{ height: '0.5rem' }} />
              </div>
            )
          })}

          {/* Admin paneli */}
          {isAdmin && (
            <button
              onClick={() => handleNav('/admin')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', borderLeft: '3px solid transparent' }}
            >
              <Shield size={18} color="var(--text-soft)" strokeWidth={1.8} />
              <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>Admin Panel</span>
            </button>
          )}
        </div>

        {/* Alt bölüm - tema + çıkış */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
          {/* Tema seçici */}
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tema</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { value: 'light', icon: <Sun size={14} />, label: 'Açık' },
              { value: 'dark', icon: <Moon size={14} />, label: 'Koyu' },
              { value: 'system', icon: <Monitor size={14} />, label: 'Sistem' },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => handleTheme(t.value)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                  padding: '0.5rem 0.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${theme === t.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: theme === t.value ? 'rgba(64,93,230,0.08)' : 'var(--bg-soft)',
                  color: theme === t.value ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.68rem', fontWeight: theme === t.value ? 700 : 400,
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Çıkış */}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 0', background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <LogOut size={18} color="var(--red)" strokeWidth={1.8} />
            <span style={{ fontSize: '0.88rem', color: 'var(--red)', fontWeight: 600 }}>Çıkış Yap</span>
          </button>
        </div>
      </div>
    </>
  )
}
