'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import CollectionBadge from '@/components/ui/CollectionBadge'

type Collection = {
  id: string
  name: string
  description?: string | null
  is_public?: boolean
  collection_books?: { book_id: string }[]
}

export default function CollectionsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [collections, setCollections] = useState<Collection[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [loading, user])

  useEffect(() => {
    if (user) fetchCollections()
  }, [user])

  async function authHeader() {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function fetchCollections() {
    try {
      const headers = await authHeader()
      const res = await fetch('/api/collections', { headers })
      const json = await res.json()
      if (res.ok) setCollections(json.data || [])
    } catch {
      setMessage('Koleksiyonlar alınamadı')
    }
  }

  async function createCollection() {
    if (!name.trim()) return
    try {
      const headers = await authHeader()
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Oluşturulamadı')
      setCollections((prev) => [json.data, ...prev])
      setName('')
      setDescription('')
    } catch (e: any) {
      setMessage(e?.message || 'Koleksiyon oluşturulamadı')
    }
  }

  async function deleteCollection(id: string) {
    try {
      const headers = await authHeader()
      const query = new URLSearchParams({ id }).toString()
      const res = await fetch(`/api/collections?${query}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Silinemedi')
      setCollections((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setMessage('Koleksiyon silinemedi')
    }
  }

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1rem 1rem 6rem' }}>
      <h1 style={{ fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.4rem' }}>Koleksiyonlar</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.9rem' }}>Kitaplarını özel listelerde grupla.</p>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.9rem', display: 'grid', gap: '0.55rem' }}>
        <input className="input" placeholder="Koleksiyon adı" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Açıklama (opsiyonel)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="btn-primary" onClick={createCollection} style={{ width: 'fit-content' }}>Oluştur</button>
      </div>

      {message && <p style={{ marginTop: '0.7rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{message}</p>}

      <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.6rem' }}>
        {collections.map((c) => (
          <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
              <CollectionBadge name={c.name} count={c.collection_books?.length || 0} icon="🗂️" />
              <button onClick={() => deleteCollection(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--red)' }}>Sil</button>
            </div>
            {c.description && <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem' }}>{c.description}</p>}
          </div>
        ))}
      </div>
    </main>
  )
}
