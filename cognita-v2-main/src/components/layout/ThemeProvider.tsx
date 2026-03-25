'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initTheme } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useEffect(() => { initTheme() }, [pathname])
  useEffect(() => {
    initTheme()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => { if (localStorage.getItem('theme') === 'system') initTheme() }
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return <>{children}</>
}
