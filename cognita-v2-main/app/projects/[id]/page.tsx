'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { ArrowLeft, Plus, X, BookOpen, Target, Calendar, Check, Search } from 'lucide-react'
import BookCover from '@/components/ui/BookCover'

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
}

interface ProjectBook {
  book_id: string
  added_at: string
  books: {
    id: string
    title: string
    author: string | null
    total_pages: number
    cover_url: string | null
  }
}

interface UserBook {
  id: string
  title: string
  author: string | null
  total_pages: number
  cover_url: string | null
}

const GRADIENTS = [
  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
  'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
  'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
  'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
  'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
  'linear-gradient(135deg, #FEE140 0%, #FA709A 100%)',
  'linear-gradient(135deg, #30CFD0 0%, #330867 100%)',
]

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const { user, loading } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [projectBooks, setProjectBooks] = useState<ProjectBook[]>([])
  const [sessions, setSessions] = useState<Record<string, number>>({})
  const [showAddBook, setShowAddBook] = useState(false)
  const [userBooks, setUserBooks] = useState<UserBook[]>([])
  const [bookSearch, setBookSearch] = useState('')
  const [addingBook, setAddingBook] = useState(false)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => {
    if (user && projectId) {
      fetchProject()
      fetchProjectBooks()
      fetchSessions()
    }
  }, [user, projectId])

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user!.id)
      .single()
    if (!data) { router.push('/projects'); return }
    setProject(data)
  }

  const fetchProjectBooks = async () => {
    const { data } = await supabase
      .from('project_books')
      .select('book_id, added_at, books(id, title, author, total_pages, cover_url)')
      .eq('project_id', projectId)
      .order('added_at', { ascending: false })
    setProjectBooks((data as any) || [])
  }

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('reading_sessions')
      .select('book_id, progress_percent')
      .eq('user_id', user!.id)
    const map: Record<string, number> = {}
    if (data) data.forEach(s => { map[s.book_id] = s.progress_percent })
    setSessions(map)
  }

  const fetchUserBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('id, title, author, total_pages, cover_url')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    const existingIds = projectBooks.map(pb => pb.book_id)
    setUserBooks((data || []).filter(b => !existingIds.includes(b.id)))
  }

  const handleOpenAddBook = () => {
    fetchUserBooks()
    setShowAddBook(true)
  }

  const handleAddBook = async (bookId: string) => {
    setAddingBook(true)
    await supabase.from('project_books').insert({ project_id: projectId, book_id: bookId })
    await fetchProjectBooks()
    setUserBooks(prev => prev.filter(b => b.id !== bookId))
    setAddingBook(false)
  }

  const handleRemoveBook = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Kitabı projeden çıkar?')) return
    await supabase.from('project_books').delete().eq('project_id', projectId).eq('book_id', bookId)
    fetchProjectBooks()
  }

  const completedCount = projectBooks.filter(pb => (sessions[pb.book_id] || 0) >= 100).length
  const totalBooks = projectBooks.length
  const overallProgress = project?.goal_books
    ? Math.min(100, (completedCount / project.goal_books) * 100)
    : totalBooks > 0 ? (completedCount / totalBooks) * 100 : 0

  const filteredUserBooks = userBooks.filter(b =>
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    (b.author || '').toLowerCase().includes(bookSearch.toLowerCase())
  )

  const daysLeft = project?.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  if (loading || !user || !project) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      {/* Header */}
      <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
          <button onClick={() => router.push('/projects')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text)' }}>
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>{project.emoji}</span>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.title}</h1>
            </div>
            {project.description && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.description}</p>
            )}
          </div>
          <button onClick={handleOpenAddBook} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.9rem', background: 'var(--text)', border: 'none', borderRadius: '20px', color: 'var(--bg)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={15} /> Kitap
          </button>
        </div>
      </header>

      {/* İlerleme Kartı */}
      <div style={{ margin: '1rem', background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `${project.color}20` }}>
          <div style={{ height: '100%', width: `${overallProgress}%`, background: project.color, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Genel İlerleme</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>%{Math.round(overallProgress)}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, color: project.color }}>{completedCount}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bitti</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>{totalBooks}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Toplam</p>
            </div>
            {project.goal_books && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-muted)' }}>{project.goal_books}</p>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Hedef</p>
              </div>
            )}
          </div>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-soft)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
          <div style={{ height: '100%', width: `${overallProgress}%`, background: project.color, borderRadius: '4px', transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {project.goal_books && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Target size={12} color={project.color} /> Hedef: {project.goal_books} kitap
            </span>
          )}
          {daysLeft !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: daysLeft < 7 ? '#E63946' : 'var(--text-muted)', fontWeight: daysLeft < 7 ? 700 : 400 }}>
              <Calendar size={12} /> {daysLeft > 0 ? `${daysLeft} gün kaldı` : daysLeft === 0 ? 'Bugün son gün!' : 'Süre doldu'}
            </span>
          )}
        </div>
      </div>

      {/* Kitaplar */}
      <div style={{ padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BookOpen size={15} color={project.color} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Kitaplar</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{totalBooks} kitap</span>
        </div>

        {projectBooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📚</div>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>Henüz kitap yok</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Bu projeye kitap ekleyerek başla</p>
            <button onClick={handleOpenAddBook} style={{ padding: '0.55rem 1.25rem', background: project.color, border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              + Kitap Ekle
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {projectBooks.map((pb, i) => {
              const book = pb.books as any
              const progress = sessions[pb.book_id] || 0
              const isCompleted = progress >= 100
              return (
                <div
                  key={pb.book_id}
                  onClick={() => router.push(`/reader/${pb.book_id}`)}
                  style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '0.85rem', display: 'flex', gap: '0.85rem', cursor: 'pointer', border: `1px solid ${isCompleted ? `${project.color}40` : 'var(--border)'}` }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <BookCover title={book.title} coverUrl={book.cover_url} width={50} height={68} borderRadius={8} index={i} style={{ boxShadow: 'none' }} />
                    {isCompleted && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `${project.color}CC`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={20} color="white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                    {book.author && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{book.author}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: progress > 0 ? '0.4rem' : 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isCompleted ? '#43E97B' : progress > 0 ? project.color : 'var(--text-muted)', background: isCompleted ? 'rgba(67,233,123,0.1)' : progress > 0 ? `${project.color}15` : 'var(--bg-soft)', padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
                        {isCompleted ? '✓ Bitti' : progress > 0 ? 'Devam Ediyor' : 'Başlamadı'}
                      </span>
                    </div>
                    {progress > 0 && (
                      <div style={{ height: '3px', background: 'var(--bg-soft)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: isCompleted ? '#43E97B' : project.color, borderRadius: '2px' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <button onClick={(e) => handleRemoveBook(pb.book_id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                      <X size={14} color="var(--border)" />
                    </button>
                    {progress > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isCompleted ? '#43E97B' : project.color }}>%{Math.round(progress)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Kitap Ekleme Modal */}
      {showAddBook && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '1.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Kitap Ekle</h3>
              <button onClick={() => { setShowAddBook(false); setBookSearch('') }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
            </div>
            <div style={{ position: 'relative', marginBottom: '1rem', flexShrink: 0 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Kitap ara..." style={{ paddingLeft: '2.3rem' }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredUserBooks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {userBooks.length === 0 ? 'Kütüphanende eklenecek kitap yok' : 'Sonuç bulunamadı'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredUserBooks.map((book, i) => (
                    <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem', background: 'var(--bg-soft)', borderRadius: '12px' }}>
                      <BookCover title={book.title} coverUrl={book.cover_url} width={44} height={60} borderRadius={8} index={i} style={{ boxShadow: 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                        {book.author && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{book.author}</p>}
                      </div>
                      <button onClick={() => handleAddBook(book.id)} disabled={addingBook} style={{ padding: '0.4rem 0.85rem', background: project.color, border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: addingBook ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: addingBook ? 0.6 : 1 }}>
                        Ekle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
