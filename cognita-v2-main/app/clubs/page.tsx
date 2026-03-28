'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

interface ReadingGroup {
  id: string
  name: string
  description?: string | null
  is_public: boolean
  created_at: string
  reading_group_members?: Array<{ user_id: string }>
}

interface GroupMessage {
  id: string
  group_id: string
  user_id: string
  message: string
  section_key?: string | null
  created_at: string
  profiles?: {
    username?: string | null
    full_name?: string | null
    avatar_url?: string | null
  } | null
}

export default function ClubsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [groups, setGroups] = useState<ReadingGroup[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [sectionTag, setSectionTag] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [loading, user, router])

  useEffect(() => {
    if (user) void loadGroups()
  }, [user])

  useEffect(() => {
    if (!selectedGroupId || !user) return

    const channel = supabase
      .channel(`reading_group_${selectedGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reading_group_messages',
          filter: `group_id=eq.${selectedGroupId}`,
        },
        (payload) => {
          const data = payload.new as GroupMessage
          if (data?.id) {
            void loadMessages(selectedGroupId)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedGroupId, user])

  const authHeaders = async () => {
    const { supabase } = await import('@/lib/supabase')
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadGroups = async () => {
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/reading-groups', { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gruplar yuklenemedi')
      setGroups(json.data || [])
    } catch (err: any) {
      setError(err.message || 'Hata')
    }
  }

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setBusy(true)
    setError(null)
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      }
      const res = await fetch('/api/reading-groups', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create', name: name.trim(), description: description.trim(), is_public: isPublic }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kulup olusturulamadi')

      setName('')
      setDescription('')
      await loadGroups()
    } catch (err: any) {
      setError(err.message || 'Hata')
    } finally {
      setBusy(false)
    }
  }

  const joinGroup = async (groupId: string) => {
    setBusy(true)
    setError(null)
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      }
      const res = await fetch('/api/reading-groups', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'join', group_id: groupId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gruba katilinamadi')
      setSelectedGroupId(groupId)
      await loadMessages(groupId)
      await loadGroups()
    } catch (err: any) {
      setError(err.message || 'Hata')
    } finally {
      setBusy(false)
    }
  }

  const loadMessages = async (groupId: string) => {
    setError(null)
    try {
      const headers = await authHeaders()
      const query = new URLSearchParams({ group_id: groupId }).toString()
      const res = await fetch(`/api/reading-groups?${query}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Mesajlar yuklenemedi')
      setMessages(json.messages || [])
    } catch (err: any) {
      setError(err.message || 'Hata')
    }
  }

  const sendMessage = async () => {
    if (!selectedGroupId || !messageText.trim()) return
    setBusy(true)
    setError(null)
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      }
      const res = await fetch('/api/reading-groups', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'message', group_id: selectedGroupId, message: messageText.trim(), section_key: sectionTag.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Mesaj gonderilemedi')
      setMessages((prev) => [...prev, json.data])
      setMessageText('')
    } catch (err: any) {
      setError(err.message || 'Hata')
    } finally {
      setBusy(false)
    }
  }

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId) || null, [groups, selectedGroupId])
  const availableSections = useMemo(() => {
    const keys = messages.map((m) => m.section_key).filter((x): x is string => !!x)
    return Array.from(new Set(keys))
  }, [messages])
  const filteredMessages = useMemo(() => {
    if (sectionFilter === 'all') return messages
    return messages.filter((m) => (m.section_key || '') === sectionFilter)
  }, [messages, sectionFilter])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Kitap Kulupleri</h1>
          <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>Ayni kitabi okuyanlarla bolum bolum tartis.</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)' }}>
            {error}
          </div>
        )}

        <form onSubmit={createGroup} style={{ display: 'grid', gap: 10, padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <strong>Yeni Kulup Olustur</strong>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kulup adi"
            style={{ padding: '0.7rem 0.8rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kisa aciklama"
            rows={3}
            style={{ padding: '0.7rem 0.8rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Herkese acik kulup
          </label>
          <button
            type="submit"
            disabled={busy}
            style={{ width: 'fit-content', border: 'none', borderRadius: 10, padding: '0.6rem 1rem', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}
          >
            {busy ? 'Olusturuluyor...' : 'Kulup Olustur'}
          </button>
        </form>

        <div style={{ display: 'grid', gap: 10 }}>
          {(groups || []).map((group) => (
            <div key={group.id} style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{group.name}</strong>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>{group.description || 'Aciklama yok.'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setSelectedGroupId(group.id); void loadMessages(group.id) }}
                    disabled={busy}
                    style={{ border: 'none', borderRadius: 10, padding: '0.5rem 0.85rem', background: selectedGroupId === group.id ? 'var(--accent)' : 'var(--bg)', color: selectedGroupId === group.id ? 'white' : 'var(--text)', cursor: 'pointer' }}
                  >
                    Ac
                  </button>
                  <button
                    onClick={() => joinGroup(group.id)}
                    disabled={busy}
                    style={{ border: 'none', borderRadius: 10, padding: '0.5rem 0.85rem', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}
                  >
                    Katil
                  </button>
                </div>
              </div>
            </div>
          ))}
          {groups.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Henuz kulup yok. Ilk kulubu sen olustur.</p>}
        </div>

        {selectedGroup && (
          <div style={{ marginTop: 8, padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, display: 'grid', gap: 10 }}>
            <div>
              <strong>{selectedGroup.name} · Sohbet</strong>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gercek zamanli mesajlar</p>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 8, paddingRight: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bolum filtresi:</span>
                <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} style={{ padding: '0.3rem 0.45rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
                  <option value="all">Tum mesajlar</option>
                  {availableSections.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              {filteredMessages.map((m) => (
                <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.55rem 0.7rem', background: m.user_id === user?.id ? 'rgba(64,93,230,0.12)' : 'var(--bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} alt="avatar" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-soft)', display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                        {(m.profiles?.full_name || m.profiles?.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{m.profiles?.full_name || m.profiles?.username || 'Kullanici'}</strong>
                    {m.section_key && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '0.1rem 0.45rem' }}>{m.section_key}</span>}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text)' }}>{m.message}</p>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(m.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
              {filteredMessages.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>Filtreye uygun mesaj yok.</p>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Mesaj yaz"
                style={{ flex: 1, padding: '0.7rem 0.8rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
              />
              <input
                value={sectionTag}
                onChange={(e) => setSectionTag(e.target.value)}
                placeholder="Bolum etiketi"
                style={{ width: 140, padding: '0.7rem 0.8rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
              />
              <button
                onClick={sendMessage}
                disabled={busy || !messageText.trim()}
                style={{ border: 'none', borderRadius: 10, padding: '0.6rem 0.9rem', background: 'var(--accent)', color: 'white', cursor: 'pointer', opacity: busy || !messageText.trim() ? 0.6 : 1 }}
              >
                Gonder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
