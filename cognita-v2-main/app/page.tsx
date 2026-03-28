'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.replace('/auth/login')
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? '/home' : '/auth/login')
    })
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontFamily: 'serif', fontSize: '3rem' }}>
        Cogni<span style={{ color: '#2D6A4F' }}>ta</span>
      </h1>
    </main>
  )
}
