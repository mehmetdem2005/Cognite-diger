'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { ArrowLeft, Bell } from 'lucide-react'

interface Notification {
  id: string; type: string; message: string; is_read: boolean; created_at: string
  profiles: { username: string | null; full_name: string | null } | null
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) { fetchNotifications(); markAllRead() } }, [user])

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*, profiles:from_user_id(username, full_name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false)
  }

  const getIcon = (type: string) => {
    if (type === 'follow') return '👤'
    if (type === 'like') return '❤️'
    if (type === 'comment') return '💬'
    return '🔔'
  }

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ padding: '1rem 1.5rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><ArrowLeft size={20} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Bildirimler</h1>
      </header>

      <div style={{ padding: '1rem', paddingBottom: '80px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <Bell size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Henüz bildirim yok</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map(n => (
              <div key={n.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: n.is_read ? 'var(--bg-card)' : 'rgba(45,106,79,0.05)', borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--accent)' }}>
                <span style={{ fontSize: '1.5rem' }}>{getIcon(n.type)}</span>
                <div style={{ flex: 1 }}>
                  {n.profiles && <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.9rem' }}>@{n.profiles.username} </span>}
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-soft)' }}>{n.message}</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
