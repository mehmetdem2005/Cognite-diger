'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { Plus, X, ChevronRight } from 'lucide-react'

interface Story {
  id: string; title: string; description: string | null; genre: string | null
  is_published: boolean; likes_count: number; views_count: number; created_at: string
}

export default function WritePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [stories, setStories] = useState<Story[]>([])
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) fetchStories() }, [user])

  const fetchStories = async () => {
    const { data } = await supabase.from('stories').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
    setStories(data || [])
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('stories').insert({
      user_id: user!.id, title: title.trim(),
      description: description.trim() || null,
      genre: genre.trim() || null,
    }).select().single()
    setSaving(false)
    setTitle(''); setDescription(''); setGenre(''); setShowNew(false)
    fetchStories()
  }

  const GENRES = ['Roman', 'Hikaye', 'Şiir', 'Deneme', 'Bilim Kurgu', 'Fantastik', 'Korku', 'Romantik']

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ padding: '1.25rem 1.5rem 0.75rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>Yazılarım</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hikayeni dünyayla paylaş</p>
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '8px' }}>
            <Plus size={16} /> Yeni
          </button>
        </div>
      </header>

      <div style={{ padding: '1.5rem' }}>
        {stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✍️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.5rem' }}>Henüz Yazı Yok</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>İlk hikayeni yazmaya başla</p>
            <button className="btn-primary" onClick={() => setShowNew(true)}>+ Yeni Hikaye</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stories.map(story => (
              <div key={story.id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => router.push(`/write/${story.id}`)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 500 }}>{story.title}</h3>
                    <span className={story.is_published ? 'tag-accent tag' : 'tag'} style={{ fontSize: '0.65rem' }}>
                      {story.is_published ? 'Yayında' : 'Taslak'}
                    </span>
                  </div>
                  {story.genre && <span className="tag" style={{ fontSize: '0.7rem' }}>{story.genre}</span>}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>❤️ {story.likes_count}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👁 {story.views_count}</span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 500 }}>Yeni Hikaye</h3>
              <button onClick={() => setShowNew(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.4rem' }}>Başlık *</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Hikayenin adı..." />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.4rem' }}>Açıklama</label>
              <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Kısa bir açıklama..." rows={3} style={{ resize: 'none' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.5rem' }}>Tür</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {GENRES.map(g => (
                  <button key={g} onClick={() => setGenre(genre === g ? '' : g)} style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', border: `1.5px solid ${genre === g ? 'var(--accent)' : 'var(--border)'}`, background: genre === g ? 'rgba(45,106,79,0.1)' : 'transparent', color: genre === g ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: genre === g ? 600 : 400 }}>{g}</button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={handleCreate} disabled={saving || !title.trim()} style={{ width: '100%', padding: '0.9rem' }}>
              {saving ? 'Oluşturuluyor...' : 'Hikaye Oluştur'}
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  )
}
