'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { interaction } from '@/lib/interaction'

const TYPE_LABELS: Record<string, string> = {
  follow:  'seni takip etmeye başladı',
  like:    'kitabını beğendi',
  comment: 'kitabına yorum yaptı',
}

function isNotifEnabled() {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem('cognita_notif') !== 'false'
}

async function requestPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

function showBrowserNotif(actor: string, type: string) {
  if (!isNotifEnabled()) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification('Cognita', {
      body: `${actor} ${TYPE_LABELS[type] || 'bir bildirim gönderdi'}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    })
  } catch {}
}

export default function NotificationListener() {
  const { user } = useAuth()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const setupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return

    // Tarayıcı bildirim izni iste
    requestPermission()

    // Eski kanalı temizle
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    if (setupTimerRef.current) {
      clearTimeout(setupTimerRef.current)
      setupTimerRef.current = null
    }

    setupTimerRef.current = setTimeout(() => {
      channelRef.current = supabase
        .channel(`notif_listener_${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as { type: string; message: string; from_user_id?: string }
            interaction.notification()

            // Profil ismini çek ve bildirim göster
            if (n.from_user_id) {
              supabase
                .from('profiles')
                .select('username, full_name')
                .eq('id', n.from_user_id)
                .single()
                .then(({ data }) => {
                  const actor = data?.full_name || data?.username || 'Birisi'
                  showBrowserNotif(actor, n.type)
                })
            } else {
              showBrowserNotif('Cognita', n.type)
            }
          },
        )
        .subscribe()
      setupTimerRef.current = null
    }, 4000)

    return () => {
      if (setupTimerRef.current) {
        clearTimeout(setupTimerRef.current)
        setupTimerRef.current = null
      }
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [user])

  return null
}
