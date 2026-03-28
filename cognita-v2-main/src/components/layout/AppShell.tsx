'use client'
import { useEffect, useState, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import { initTheme } from '@/lib/theme'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import SideDrawer from '@/components/ui/SideDrawer'

interface Profile {
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
  xp?: number
  level?: number
  streak_days?: number
  total_pages_read?: number
}

// Global drawer context — herhangi bir sayfadan açılabilsin
interface AppShellContext {
  openDrawer: () => void
  closeDrawer: () => void
  isAdmin: boolean
  profile: Profile | null
}

export const AppShellCtx = createContext<AppShellContext>({
  openDrawer: () => {},
  closeDrawer: () => {},
  isAdmin: false,
  profile: null,
})

export const useAppShell = () => useContext(AppShellCtx)

// Auth sayfaları ve özel sayfalar — drawer gösterme
const NO_SHELL_PATHS = ['/auth/', '/auth/login', '/auth/register']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    initTheme()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => { if (localStorage.getItem('theme') === 'system') initTheme() }
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // Kullanıcı oturumu
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUserId(null)
      setProfile(null)
      setIsAdmin(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        fetchProfile(session.user.id)
        checkAdmin(session.user.id)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        fetchProfile(session.user.id)
        checkAdmin(session.user.id)
      } else {
        setUserId(null)
        setProfile(null)
        setIsAdmin(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url, xp, level, streak_days, total_pages_read')
      .eq('id', uid)
      .single()
    if (data) setProfile(data)
  }

  const checkAdmin = async (uid: string) => {
    const { data } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', uid)
      .single()
    setIsAdmin(!!data)
  }

  // Sayfa geçiş animasyonu
  useEffect(() => {
    if (pathname !== prevPath) {
      setTransitioning(true)
      const t = setTimeout(() => {
        setPrevPath(pathname)
        setTransitioning(false)
      }, 80)
      return () => clearTimeout(t)
    }
  }, [pathname])

  // Drawer kapatınca scroll kilidi kaldır
  useEffect(() => {
    if (!drawerOpen) document.body.style.overflow = ''
  }, [drawerOpen])

  const noShell = NO_SHELL_PATHS.some(p => pathname.startsWith(p))

  return (
    <AppShellCtx.Provider value={{
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      isAdmin,
      profile,
    }}>
      {/* Sayfa içeriği — geçiş animasyonu */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        minHeight: '100dvh',
        overflowX: 'clip',
        opacity: transitioning ? 0 : 1,
        transition: 'opacity 0.08s ease',
      }}>
        {children}
      </div>

      {/* SideDrawer — auth sayfalarında gösterme */}
      {!noShell && (
        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          profile={profile}
          isAdmin={isAdmin}
        />
      )}
    </AppShellCtx.Provider>
  )
}
