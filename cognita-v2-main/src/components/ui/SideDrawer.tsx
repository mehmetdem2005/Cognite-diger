'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  X, Home, BookOpen, Sparkles, Compass, User, Settings,
  BarChart2, Trophy, FolderOpen, Bell, Moon, Sun, Monitor,
  PenTool, Library, LogOut, Shield, Bookmark, Zap, Users
} from 'lucide-react'
import { applyTheme, getTheme } from '@/lib/theme'
import { useAuth } from '@/lib/useAuth'
import { useState } from 'react'
import BookCover from '@/components/ui/BookCover'
import { getStoredLocale, Locale, t } from '@/lib/i18n'

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
  { icon: Home, labelKey: 'drawerHome', href: '/home', section: 'main' },
  { icon: BookOpen, labelKey: 'drawerMyBooks', href: '/library', section: 'main' },
  { icon: Sparkles, labelKey: 'drawerFlow', href: '/flow', section: 'main' },
  { icon: Compass, labelKey: 'drawerExplore', href: '/explore', section: 'main' },
  { icon: Library, labelKey: 'drawerCatalog', href: '/catalog', section: 'main' },
  { icon: BookOpen, labelKey: 'drawerVocabulary', href: '/vocabulary', section: 'main' },
  { icon: PenTool, labelKey: 'drawerWriterStudio', href: '/write', section: 'create' },
  { icon: FolderOpen, labelKey: 'drawerProjects', href: '/projects', section: 'create' },
  { icon: FolderOpen, labelKey: 'drawerCollections', href: '/collections', section: 'create' },
  { icon: Bookmark, labelKey: 'drawerSaved', href: '/library?tab=saved', section: 'create' },
  { icon: Trophy, labelKey: 'drawerChallenges', href: '/challenges', section: 'social' },
  { icon: BarChart2, labelKey: 'drawerStats', href: '/stats', section: 'social' },
  { icon: Bell, labelKey: 'drawerNotifications', href: '/notifications', section: 'social' },
  { icon: Users, labelKey: 'drawerClubs', href: '/clubs', section: 'social' },
  { icon: User, labelKey: 'drawerProfile', href: '/profile', section: 'account' },
  { icon: Settings, labelKey: 'drawerSettings', href: '/settings', section: 'account' },
]

const SECTIONS = [
  { key: 'main', labelKey: 'drawerSectionMain' },
  { key: 'create', labelKey: 'drawerSectionCreate' },
  { key: 'social', labelKey: 'drawerSectionSocial' },
  { key: 'account', labelKey: 'drawerSectionAccount' },
]

export default function SideDrawer({ open, onClose, profile, isAdmin = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { signOut } = useAuth() as any
  const [theme, setTheme] = useState(() => typeof window !== 'undefined' ? getTheme() : 'light')
  const [locale, setLocale] = useState<Locale>(() => typeof window !== 'undefined' ? getStoredLocale() : 'tr')
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onLanguageChanged = () => setLocale(getStoredLocale())
    window.addEventListener('storage', onLanguageChanged)
    window.addEventListener('cognita-language-changed', onLanguageChanged)
    return () => {
      window.removeEventListener('storage', onLanguageChanged)
      window.removeEventListener('cognita-language-changed', onLanguageChanged)
    }
  }, [])

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
        className={`fixed inset-0 z-[9998] backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.5)' }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 bottom-0 right-0 z-[9999] w-min[320px] max-w-[85vw] bg-card border-l border-border flex flex-col overflow-y-auto transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: 'min(320px, 85vw)',
          boxShadow: open ? '-10px 0 30px rgba(0,0,0,0.15)' : 'none',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Profile section */}
        <div className="relative p-5 pt-12 bg-gradient-to-br from-accent to-accent-2">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 border-none cursor-pointer backdrop-blur-md hover:bg-white/30 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>

          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-3 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-white font-bold">
                {(profile?.full_name || profile?.username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>

          <p className="text-white font-bold text-base mb-0.5">
            {profile?.full_name || profile?.username || t(locale, 'drawerDefaultUser')}
          </p>
          <p className="text-white/70 text-xs mb-4">
            @{profile?.username || t(locale, 'drawerAnon')} • Lv.{profile?.level || 1}
          </p>

          {/* XP bar */}
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-white/80 text-xs font-semibold flex items-center gap-0.5">
                <Zap size={10} />
                {profile?.xp || 0} XP
              </span>
              <span className="text-white/60 text-xs">
                {200 - ((profile?.xp || 0) % 200)} / sonraki
              </span>
            </div>
            <div className="h-1 bg-white/20 rounded overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500 rounded"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          {/* Streak */}
          {(profile?.streak_days || 0) > 0 && (
            <div className="inline-flex items-center gap-1 bg-white/15 rounded-full px-1.5 py-0.5 text-xs text-white">
              🔥 {profile?.streak_days} {t(locale, 'drawerStreakSuffix')}
            </div>
          )}
        </div>

        {/* Menu items */}
        <div className="flex-1 py-3">
          {SECTIONS.map(section => {
            const items = MENU_ITEMS.filter(i => i.section === section.key)
            return (
              <div key={section.key}>
                <p className="px-5 py-1 text-xs font-bold text-text-muted uppercase tracking-widest">
                  {t(locale, section.labelKey)}
                </p>
                {items.map(item => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.href.split('?')[0])
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNav(item.href)}
                      className={`w-full flex items-center gap-3 px-5 py-2 border-l-[3px] transition-all duration-150 ${
                        active
                          ? 'bg-accent/8 border-l-accent text-accent'
                          : 'border-l-transparent hover:bg-bg-soft'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={active ? 'text-accent font-bold' : 'text-text-soft'}
                        strokeWidth={active ? 2.5 : 1.8}
                      />
                      <span className={`text-sm ${active ? 'font-bold text-accent' : 'font-normal text-text'}`}>
                        {t(locale, item.labelKey)}
                      </span>
                    </button>
                  )
                })}
                <div className="h-2" />
              </div>
            )
          })}

          {/* Admin panel */}
          {isAdmin && (
            <button
              onClick={() => handleNav('/admin')}
              className="w-full flex items-center gap-3 px-5 py-2 border-l-[3px] border-l-transparent hover:bg-bg-soft transition-colors"
            >
              <Shield size={18} className="text-text-soft" strokeWidth={1.8} />
              <span className="text-sm text-text">{t(locale, 'adminPanelTitle')}</span>
            </button>
          )}
        </div>

        {/* Bottom section */}
        <div className="border-t border-border p-5">
          {/* Theme selector */}
          <p className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
            {t(locale, 'settingsThemeLabel')}
          </p>
          <div className="flex gap-2 mb-4">
            {[
              { value: 'light', icon: <Sun size={14} />, label: t(locale, 'settingsThemeLight') },
              { value: 'dark', icon: <Moon size={14} />, label: t(locale, 'settingsThemeDark') },
              { value: 'system', icon: <Monitor size={14} />, label: t(locale, 'settingsThemeSystem') },
            ].map(themeOption => (
              <button
                key={themeOption.value}
                onClick={() => handleTheme(themeOption.value)}
                className={`flex-1 flex flex-col items-center gap-0.5 p-2 rounded-md border transition-all ${
                  theme === themeOption.value
                    ? 'border-accent bg-accent/8 text-accent font-bold'
                    : 'border-border bg-bg-soft text-text-muted'
                }`}
              >
                {themeOption.icon}
                <span className="text-xs">{themeOption.label}</span>
              </button>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-2 bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity"
          >
            <LogOut size={18} className="text-red-500" strokeWidth={1.8} />
            <span className="text-sm text-red-500 font-semibold">{t(locale, 'settingsSignOut')}</span>
          </button>
        </div>
      </div>
    </>
  )
}
