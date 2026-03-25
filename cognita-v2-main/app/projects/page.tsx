'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { Plus, X, ChevronRight, FolderOpen, Target, BookOpen } from 'lucide-react'

interface Project {
  id: string
  title: string
  description: string | null
  color: string
  emoji: string
  goal_books: number | null
  deadline: string | null
  is_public: boolean
  created_at: string
  book_count?: number
  completed_count?: number
}

const COLORS = [
  '#405DE6', '#833AB4', '#C13584', '#E1306C',
  '#F77737', '#FCAF45', '#43E97B', '#4FACFE',
]

const EMOJIS = ['📚', '🎯', '🔬', '📖', '✍️', '🌍', '💡', '🧠', '🚀', '🎨', '🏆', '⭐']

export default function ProjectsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0])
  const [goalBooks, setGoalBooks] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) fetchProjects() }, [user])

  const fetchProjects = async () => {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (!projectsData) return

    const enriched = await Promise.all(projectsData.map(async (p) => {
      const { count: bookCount } = await supabase
        .from('project_books')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', p.id)

      const { data: bookIds } = await supabase
        .from('project_books')
        .select('book_id')
        .eq('project_id', p.id)

      let completedCount = 0
      if (bookIds && bookIds.length > 0) {
        const ids = bookIds.map(b => b.book_id)
        const { count } = await supabase
          .from('reading_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .gte('progress_percent', 100)
          .in('book_id', ids)
        completedCount = count || 0
      }

      return { ...p, book_count: bookCount || 0, completed_count: completedCount }
    }))

    setProjects(enriched)
  }

  const handleCreate = async () => {
    if (!title.trim() || !user) return
    setSaving(true)
    await supabase.from('projects').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      color: selectedColor,
      emoji: selectedEmoji,
      goal_books: goalBooks ? parseInt(goalBooks) : null,
      deadline: deadline || null,
      is_public: false,
    })
    setTitle(''); setDescription(''); setGoalBooks(''); setDeadline('')
    setSelectedColor(COLORS[0]); setSelectedEmoji(EMOJIS[0])
    setShowCreate(false); setSaving(false)
    fetchProjects()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Projeyi sil?')) return
    await supabase.from('projects').delete().eq('id', id)
    fetchProjects()
  }

  const getProgress = (p: Project) => {
    if (!p.goal_books || p.goal_books === 0) {
      return p.book_count ? Math.min(100, (p.completed_count || 0) / p.book_count * 100) : 0
    }
    return Math.min(100, ((p.completed_count || 0) / p.goal_books) * 100)
  }

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>Projelerim</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{projects.length} proje</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.9rem', background: 'var(--text)', border: 'none', borderRadius: '20px', color: 'var(--bg)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} /> Yeni
          </button>
        </div>
      </header>

      <div style={{ padding: '1rem' }}>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem' }}>Henüz proje yok</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Kitaplarını gruplara ayırarak okuma projeler oluştur</p>
            <button onClick={() => setShowCreate(true)} style={{ padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg, #405DE6, #833AB4)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              + İlk Projeyi Oluştur
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {projects.map((project) => {
              const progress = getProgress(project)
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem', border: '1px solid var(--border)', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `${project.color}30` }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: project.color, borderRadius: '0 2px 2px 0', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${project.color}20`, border: `2px solid ${project.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      {project.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{project.title}</p>
                        <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.4rem' }} />
                      </div>
                      {project.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.description}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <BookOpen size={12} /> {project.book_count} kitap
                        </span>
                        {project.completed_count !== undefined && project.completed_count > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#43E97B', fontWeight: 600 }}>
                            ✓ {project.completed_count} tamamlandı
                          </span>
                        )}
                        {project.goal_books && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: project.color, fontWeight: 600 }}>
                            <Target size={11} /> Hedef: {project.goal_books} kitap
                          </span>
                        )}
                        {project.deadline && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            📅 {new Date(project.deadline).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => handleDelete(project.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}>
                      <X size={15} color="var(--border)" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Proje Oluşturma Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '1.5rem', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Yeni Proje</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
            </div>

            {/* Emoji seç */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Simge</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setSelectedEmoji(e)} style={{ width: '42px', height: '42px', borderRadius: '10px', border: `2px solid ${selectedEmoji === e ? selectedColor : 'var(--border)'}`, background: selectedEmoji === e ? `${selectedColor}20` : 'var(--bg-soft)', fontSize: '1.2rem', cursor: 'pointer' }}>{e}</button>
                ))}
              </div>
            </div>

            {/* Renk seç */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Renk</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setSelectedColor(c)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: `3px solid ${selectedColor === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer' }} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Proje Adı *</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Örn: 2025 Okuma Listesi" />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Açıklama</label>
              <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Bu proje hakkında kısa bir açıklama..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <Target size={12} style={{ display: 'inline', marginRight: '0.3rem' }} />Hedef (kitap sayısı)
                </label>
                <input className="input" type="number" min="1" value={goalBooks} onChange={e => setGoalBooks(e.target.value)} placeholder="10" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>📅 Bitiş Tarihi</label>
                <input className="input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ colorScheme: 'dark' }} />
              </div>
            </div>

            <button onClick={handleCreate} disabled={saving || !title.trim()} style={{ width: '100%', padding: '0.95rem', background: `linear-gradient(135deg, ${selectedColor}, ${COLORS[(COLORS.indexOf(selectedColor) + 1) % COLORS.length]})`, border: 'none', borderRadius: '14px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: saving || !title.trim() ? 'not-allowed' : 'pointer', opacity: saving || !title.trim() ? 0.6 : 1 }}>
              {saving ? 'Oluşturuluyor...' : 'Proje Oluştur'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
