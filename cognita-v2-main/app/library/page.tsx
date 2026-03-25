'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { Plus, X, Search, Clock, Bookmark, Upload, FileText, Image, BookMarked, Sparkles, ChevronLeft, ChevronRight, RefreshCw, Globe, Lock, Users, UserCheck } from 'lucide-react'
import { BOOK_CATEGORIES } from '@/lib/categories'
import { interaction } from '@/lib/interaction'

interface Book { id: string; title: string; author: string | null; total_pages: number; file_type: string; tags: string[]; cover_url: string | null; created_at: string }
interface Session { book_id: string; progress_percent: number }

type Visibility = 'private' | 'friends' | 'specific' | 'public'

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

const FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'reading', label: 'Devam Ediyor' },
  { id: 'notstarted', label: 'Başlamadı' },
  { id: 'finished', label: 'Bitti' },
]

const VISIBILITY_OPTIONS: { id: Visibility; label: string; desc: string; icon: any }[] = [
  { id: 'private',  label: 'Sadece Ben',          desc: 'Yalnızca sen görürsün',      icon: Lock      },
  { id: 'friends',  label: 'Arkadaşlarım',         desc: 'Takipçilerin görebilir',     icon: Users     },
  { id: 'specific', label: 'Belirli Arkadaşlar',   desc: 'Seçtiğin kişiler görebilir', icon: UserCheck },
  { id: 'public',   label: 'Herkese Açık',         desc: 'Herkes görebilir',           icon: Globe     },
]

export default function LibraryPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'reading'|'notstarted'|'finished'>('all')
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [uploadMode, setUploadMode] = useState<'text'|'pdf'>('text')
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  // AI cover states
  const [aiCovers, setAiCovers] = useState<string[]>([])
  const [aiCoverIdx, setAiCoverIdx] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const aiProgressRef = useRef<NodeJS.Timeout | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [coverSource, setCoverSource] = useState<string | null>(null)
  const [coverImgLoading, setCoverImgLoading] = useState(false)
  // AI classify state
  const [classifyLoading, setClassifyLoading] = useState(false)
  // PDF + save progress
  const [pdfProgress, setPdfProgress] = useState(0)
  const [saveStep, setSaveStep] = useState('')
  // AI book info (description + title/author auto-fill)
  const [description, setDescription] = useState('')
  const [infoLoading, setInfoLoading] = useState(false)
  const [titleAI, setTitleAI] = useState(false)  // was title AI-suggested?
  const [authorAI, setAuthorAI] = useState(false)
  const [aiInfoError, setAiInfoError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) { fetchBooks(); fetchSessions(); loadBookmarks() } }, [user])

  const fetchBooks = async () => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      const res = await fetch('/api/books', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const json = await res.json()
        setBooks(json.data || [])
      } else {
        // Fallback to client-side query
        const { data } = await supabase.from('books').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
        setBooks(data || [])
      }
    } catch {
      const { data } = await supabase.from('books').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
      setBooks(data || [])
    }
  }

  const fetchSessions = async () => {
    const { data } = await supabase.from('reading_sessions').select('book_id, progress_percent').eq('user_id', user!.id)
    setSessions(data || [])
  }

  const loadBookmarks = () => {
    const saved = localStorage.getItem(`bookmarks_${user!.id}`)
    if (saved) setBookmarks(JSON.parse(saved))
  }

  const toggleBookmark = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    interaction.bookmark()
    const updated = bookmarks.includes(bookId) ? bookmarks.filter(b => b !== bookId) : [...bookmarks, bookId]
    setBookmarks(updated)
    localStorage.setItem(`bookmarks_${user!.id}`, JSON.stringify(updated))
  }

  const getProgress = (bookId: string) => sessions.find(s => s.book_id === bookId)?.progress_percent || 0

  const getReadingTime = (pages: number) => {
    const mins = Math.round(pages * 1.5)
    if (mins < 60) return `${mins} dk`
    return `${Math.floor(mins / 60)} s ${mins % 60} dk`
  }

  const handleCoverSelect = (file: File) => {
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    // Clear AI covers when user picks manually
    setAiCovers([])
    setAiCoverIdx(0)
    setCoverImgLoading(false)
  }

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file)
    setPdfParsing(true)
    setPdfProgress(0)
    setAiInfoError(null)
    try {
      const { extractTextFromPDF } = await import('@/lib/pdfParser')
      const text = await extractTextFromPDF(file, (pct) => setPdfProgress(pct))
      setContent(text)
      // Auto-fill book info via AI
      setInfoLoading(true)
      try {
        const fname = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
        const res = await fetch('/api/ai/book-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, filename: fname }),
        })
        const info = await res.json()
        if (res.ok) {
          if (info.title) { setTitle(info.title); setTitleAI(true) }
          else setTitle(fname)
          if (info.author) { setAuthor(info.author); setAuthorAI(true) }
          if (info.description) setDescription(info.description)
        } else {
          setTitle(fname)
          const detail = info?.detail || info?.error || ''
          setAiInfoError(`AI analizi başarısız${detail ? ': ' + detail : ' — başlık ve açıklamayı manuel doldurabilirsin'}`)
        }
      } catch (e: any) {
        const fname = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
        setTitle(fname)
        setAiInfoError(`AI analizi başarısız: ${e?.message || 'bağlantı hatası'}`)
      }
      setInfoLoading(false)
    } catch (e) {
      alert('PDF okunamadı. Lütfen metin formatında deneyin ya da farklı bir PDF deneyin.')
    }
    setPdfParsing(false)
  }

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const generateAICover = async () => {
    if (!title.trim()) { setAiError('Önce kitap adını gir'); return }
    setAiLoading(true)
    setAiError(null)
    setAiProgress(0)
    // Simulate progress: quickly to 30%, then slow crawl to 90%
    aiProgressRef.current = setInterval(() => {
      setAiProgress(prev => {
        if (prev < 30) return prev + 3
        if (prev < 60) return prev + 1.5
        if (prev < 85) return prev + 0.5
        return prev
      })
    }, 400)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch('/api/ai/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: title.trim(), author: author.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kapak bulunamadı')
      if (aiProgressRef.current) clearInterval(aiProgressRef.current)
      setAiProgress(100)
      const newCovers = [...aiCovers, data.url]
      setAiCovers(newCovers)
      setAiCoverIdx(newCovers.length - 1)
      setCoverPreview(data.url)
      setCoverFile(null)
      setCoverSource(data.source || null)
      setCoverImgLoading(false)
    } catch (e: any) {
      if (aiProgressRef.current) clearInterval(aiProgressRef.current)
      setAiProgress(0)
      setAiError(e.message)
    }
    setAiLoading(false)
  }

  const navigateAiCover = (dir: 'prev' | 'next') => {
    const next = dir === 'prev' ? aiCoverIdx - 1 : aiCoverIdx + 1
    if (next < 0 || next >= aiCovers.length) return
    setAiCoverIdx(next)
    setCoverPreview(aiCovers[next])
    setCoverImgLoading(true)
  }

  const generateDescription = async (text: string) => {
    if (!text.trim() || text.trim().split(/\s+/).length < 50) return
    setInfoLoading(true)
    try {
      const res = await fetch('/api/ai/book-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, filename: title || '' }),
      })
      const info = await res.json()
      if (res.ok) {
        if (info.description) setDescription(info.description)
        if (info.title && !title) { setTitle(info.title); setTitleAI(true) }
        if (info.author && !author) { setAuthor(info.author); setAuthorAI(true) }
      }
    } catch {}
    setInfoLoading(false)
  }

  const autoClassify = async () => {
    if (!title.trim()) return
    setClassifyLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const snippet = content.slice(0, 2000)
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), author: author.trim(), content: snippet }),
      })
      const data = await res.json()
      if (res.ok && data.categories?.length) setSelectedCategories(data.categories)
    } catch {}
    setClassifyLoading(false)
  }

  const handleAdd = async () => {
    if (!title.trim() || !user) return
    setSaving(true)
    setSaveError(null)
    setSaveStep('')

    try {
      // Upload cover via server API
      let uploadedCoverUrl: string | null = null
      if (coverFile) {
        setSaveStep('Kapak yükleniyor...')
        try {
          const session = await supabase.auth.getSession()
          const token = session.data.session?.access_token
          const fd = new FormData()
          fd.append('file', coverFile)
          const res = await fetch('/api/cover-upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          })
          const d = await res.json()
          if (res.ok) uploadedCoverUrl = d.url
        } catch {}
      } else if (aiCovers.length > 0) {
        uploadedCoverUrl = aiCovers[aiCoverIdx]
      }

      setSaveStep('Kitap kaydediliyor...')
      const words = content.trim().split(/\s+/).filter(Boolean).length
      const pages = Math.max(1, Math.ceil(words / 300))
      const isPublic = visibility !== 'private'

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const bookRes = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || null,
          description: description.trim() || null,
          cover_url: uploadedCoverUrl,
          file_type: uploadMode,
          total_pages: pages,
          is_public: isPublic,
          tags: selectedCategories,
          content: content.trim() || null,
        }),
      })
      const bookJson = await bookRes.json()
      if (!bookRes.ok) {
        setSaveError(`Kitap kaydedilemedi: ${bookJson.error}`)
        setSaving(false)
        setSaveStep('')
        return
      }
      const data = bookJson.data

      if (data && content.trim()) {
        setSaveStep('İçerik kaydediliyor...')
        try {
          localStorage.setItem(`book_content_${data.id}`, content.trim())
        } catch {
          // localStorage quota aşıldı — içerik veritabanına kaydedildi, sorun yok
        }
      }
      interaction.success()

      // Reset form
      setTitle(''); setAuthor(''); setContent(''); setPdfFile(null)
      setSelectedCategories([]); setCoverFile(null); setCoverPreview(null)
      setAiCovers([]); setAiCoverIdx(0); setAiError(null); setCoverSource(null)
      setVisibility('public'); setShowAdd(false)
      setDescription(''); setTitleAI(false); setAuthorAI(false); setAiInfoError(null); setCoverImgLoading(false)
      setPdfProgress(0)
      fetchBooks()
    } catch (err: any) {
      setSaveError(`Beklenmedik hata: ${err?.message || 'lütfen tekrar dene'}`)
    } finally {
      setSaving(false)
      setSaveStep('')
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Kitabı sil?')) return
    interaction.remove()
    await supabase.from('books').delete().eq('id', id)
    localStorage.removeItem(`book_content_${id}`)
    fetchBooks()
  }

  const resetModal = () => {
    setShowAdd(false); setPdfFile(null); setContent('')
    setTitle(''); setAuthor(''); setCoverFile(null); setCoverPreview(null)
    setAiCovers([]); setAiCoverIdx(0); setAiError(null); setSaveError(null)
    setSelectedCategories([]); setVisibility('public'); setClassifyLoading(false)
    setDescription(''); setInfoLoading(false); setTitleAI(false); setAuthorAI(false); setCoverSource(null)
    setPdfProgress(0); setSaveStep('')
  }

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const match = b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q)
    const p = getProgress(b.id)
    if (filter === 'reading') return match && p > 0 && p < 100
    if (filter === 'notstarted') return match && p === 0
    if (filter === 'finished') return match && p >= 100
    return match
  })

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem 0.5rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>Kitaplığım</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => router.push('/catalog')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.9rem', background: 'var(--bg-soft)', border: 'none', borderRadius: '20px', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <BookMarked size={15} /> Katalog
            </button>
            <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.9rem', background: 'var(--text)', border: 'none', borderRadius: '20px', color: 'var(--bg)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} /> Ekle
            </button>
          </div>
        </div>
        <div style={{ padding: '0 1rem 0.5rem', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '1.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..." style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 0.75rem', overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)} style={{ flexShrink: 0, padding: '0.3rem 0.85rem', borderRadius: '20px', border: 'none', background: filter === f.id ? 'var(--text)' : 'var(--bg-soft)', color: filter === f.id ? 'var(--bg)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: filter === f.id ? 700 : 400, cursor: 'pointer' }}>{f.label}</button>
          ))}
        </div>
      </header>

      <div style={{ padding: '1rem' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p className="empty-state-title">Kitap Yok</p>
            <p className="empty-state-desc">İlk kitabını ekleyerek başla</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem' }}>+ Kitap Ekle</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((book, i) => {
              const progress = getProgress(book.id)
              const isBookmarked = bookmarks.includes(book.id)
              const statusLabel = progress >= 100 ? 'Bitti ✓' : progress > 0 ? 'Devam Ediyor' : 'Başlamadı'
              const statusColor = progress >= 100 ? '#43E97B' : progress > 0 ? 'var(--accent)' : 'var(--text-muted)'
              return (
                <div key={book.id} onClick={() => router.push(`/reader/${book.id}`)} style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '0.9rem', display: 'flex', gap: '0.9rem', cursor: 'pointer', border: '1px solid var(--border)' }}>
                  <div style={{ width: '58px', height: '78px', borderRadius: '8px', background: GRADIENTS[i % GRADIENTS.length], display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.15)', overflow: 'hidden', position: 'relative' }}>
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                    ) : (
                      <>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)', lineHeight: 1 }}>
                          {book.title.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase().slice(0,2)}
                        </span>
                        <span style={{ fontSize: '0.42rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textAlign: 'center', padding: '0 4px', marginTop: '3px', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {book.title.length > 18 ? book.title.slice(0,18) + '…' : book.title}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.93rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                    {book.author && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{book.author}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: statusColor, background: `${statusColor}20`, padding: '0.1rem 0.45rem', borderRadius: '999px' }}>{statusLabel}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={10} /> {getReadingTime(book.total_pages)}
                      </span>
                      {book.tags?.slice(0, 1).map(tag => {
                        const cat = BOOK_CATEGORIES.find(c => c.id === tag)
                        return cat ? <span key={tag} style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{cat.icon}</span> : null
                      })}
                    </div>
                    {progress > 0 && (
                      <div style={{ height: '3px', background: 'var(--bg-soft)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#43E97B' : 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: '2px' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <button onClick={(e) => toggleBookmark(book.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                      <Bookmark size={16} color={isBookmarked ? 'var(--accent)' : 'var(--border)'} fill={isBookmarked ? 'var(--accent)' : 'none'} />
                    </button>
                    <button onClick={(e) => handleDelete(book.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                      <X size={15} color="var(--border)" />
                    </button>
                    {progress > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)' }}>%{Math.round(progress)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Kitap Ekleme Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 1.5rem 0' }}>
              <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Yeni Kitap</h3>
                <button onClick={resetModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
              </div>

              {/* Format */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button onClick={() => setUploadMode('text')} style={{ flex: 1, padding: '0.65rem', borderRadius: '12px', border: `2px solid ${uploadMode === 'text' ? 'var(--accent)' : 'var(--border)'}`, background: uploadMode === 'text' ? 'rgba(64,93,230,0.1)' : 'transparent', color: uploadMode === 'text' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <FileText size={16} /> Metin
                </button>
                <button onClick={() => setUploadMode('pdf')} style={{ flex: 1, padding: '0.65rem', borderRadius: '12px', border: `2px solid ${uploadMode === 'pdf' ? 'var(--accent)' : 'var(--border)'}`, background: uploadMode === 'pdf' ? 'rgba(64,93,230,0.1)' : 'transparent', color: uploadMode === 'pdf' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Upload size={16} /> PDF
                </button>
              </div>

              {uploadMode === 'pdf' && (
                <div style={{ marginBottom: '1rem' }}>
                  <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={e => e.target.files?.[0] && handlePdfUpload(e.target.files[0])} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '1.25rem', border: `2px dashed ${pdfFile ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '12px', background: pdfFile ? 'rgba(64,93,230,0.05)' : 'var(--bg-soft)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                    <Upload size={22} color={pdfFile ? 'var(--accent)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.88rem', color: pdfFile ? 'var(--accent)' : 'var(--text-muted)', fontWeight: pdfFile ? 600 : 400 }}>
                      {pdfParsing ? `⏳ PDF okunuyor... %${pdfProgress}` : pdfFile ? `✓ ${pdfFile.name}` : 'PDF dosyası seç'}
                    </span>
                    {pdfParsing && (
                      <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pdfProgress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: '2px', transition: 'width 0.2s' }} />
                      </div>
                    )}
                    {!pdfParsing && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Telefon dosyalarından seç</span>}
                  </button>
                  {aiInfoError && !infoLoading && (
                    <div style={{ marginTop: '0.5rem', padding: '0.45rem 0.75rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#d97706' }}>⚠ {aiInfoError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Kitap Adı *</label>
                  {infoLoading && <span style={{ fontSize: '0.68rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> AI analiz ediyor...</span>}
                  {titleAI && !infoLoading && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', background: 'rgba(64,93,230,0.12)', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>✦ AI önerisi</span>}
                </div>
                <input className="input" value={title} onChange={e => { setTitle(e.target.value); setTitleAI(false) }} placeholder="Sapiens" />
              </div>

              {/* Author */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Yazar</label>
                  {authorAI && !infoLoading && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', background: 'rgba(64,93,230,0.12)', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>✦ AI önerisi</span>}
                </div>
                <input className="input" value={author} onChange={e => { setAuthor(e.target.value); setAuthorAI(false) }} placeholder="Yuval Noah Harari" />
              </div>

              {/* Kapak Bölümü */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Kapak Resmi</label>

                {/* Kapak önizleme + navigasyon */}
                {coverPreview && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={coverPreview}
                        alt="Kapak"
                        onLoad={() => setCoverImgLoading(false)}
                        onError={() => setCoverImgLoading(false)}
                        style={{ width: '100px', height: '140px', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', opacity: coverImgLoading ? 0.3 : 1, transition: 'opacity 0.3s' }}
                      />
                      {coverImgLoading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                          <RefreshCw size={20} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 600 }}>Oluşturuluyor...</span>
                        </div>
                      )}
                      <button onClick={() => { setCoverPreview(null); setCoverFile(null); setCoverSource(null); setCoverImgLoading(false); if (aiCovers.length > 0) { setAiCovers([]); setAiCoverIdx(0) } }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--text)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={12} color="var(--bg)" />
                      </button>
                    </div>
                    {/* Kaynak badge */}
                    {coverSource && (
                      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: coverSource === 'openlibrary' ? 'rgba(22,163,74,0.15)' : 'rgba(64,93,230,0.12)', color: coverSource === 'openlibrary' ? '#16a34a' : 'var(--accent)', fontWeight: 600 }}>
                        {coverSource === 'openlibrary' ? '📚 Open Library' : '✦ AI üretim'}
                      </span>
                    )}
                    {/* AI kapak navigasyon */}
                    {aiCovers.length > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={() => navigateAiCover('prev')} disabled={aiCoverIdx === 0} style={{ background: aiCoverIdx === 0 ? 'var(--bg-soft)' : 'var(--accent)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: aiCoverIdx === 0 ? 'not-allowed' : 'pointer', opacity: aiCoverIdx === 0 ? 0.4 : 1 }}>
                          <ChevronLeft size={16} color="white" />
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{aiCoverIdx + 1} / {aiCovers.length}</span>
                        <button onClick={() => navigateAiCover('next')} disabled={aiCoverIdx === aiCovers.length - 1} style={{ background: aiCoverIdx === aiCovers.length - 1 ? 'var(--bg-soft)' : 'var(--accent)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: aiCoverIdx === aiCovers.length - 1 ? 'not-allowed' : 'pointer', opacity: aiCoverIdx === aiCovers.length - 1 ? 0.4 : 1 }}>
                          <ChevronRight size={16} color="white" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* Galeriden seç */}
                  <input ref={coverRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleCoverSelect(e.target.files[0])} style={{ display: 'none' }} />
                  <button onClick={() => coverRef.current?.click()} style={{ flex: 1, padding: '0.65rem', borderRadius: '12px', border: `1.5px solid var(--border)`, background: coverFile ? 'rgba(64,93,230,0.07)' : 'var(--bg-soft)', color: coverFile ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <Image size={15} /> {coverFile ? 'Değiştir' : 'Galeriden'}
                  </button>
                  {/* AI ile oluştur */}
                  <button onClick={generateAICover} disabled={aiLoading || !title.trim()} style={{ flex: 1, padding: '0.65rem', borderRadius: '12px', border: `1.5px solid ${aiCovers.length > 0 ? 'var(--accent)' : 'var(--border)'}`, background: aiCovers.length > 0 ? 'rgba(64,93,230,0.1)' : 'var(--bg-soft)', color: aiLoading ? 'var(--accent)' : aiCovers.length > 0 ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: aiLoading || !title.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: !title.trim() ? 0.5 : 1, position: 'relative', overflow: 'hidden' }}>
                    {aiLoading && (
                      <span style={{ position: 'absolute', inset: 0, background: 'rgba(64,93,230,0.12)', transformOrigin: 'left', transform: `scaleX(${aiProgress / 100})`, transition: 'transform 0.4s ease' }} />
                    )}
                    {aiLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite', position: 'relative' }} /> : <Sparkles size={15} />}
                    <span style={{ position: 'relative' }}>
                      {aiLoading ? `%${Math.round(aiProgress)}` : aiCovers.length > 0 ? 'Tekrar ara' : 'Kapak bul'}
                    </span>
                  </button>
                </div>
                {aiError && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.35rem' }}>{aiError}</p>}
                {!title.trim() && <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>AI kapak için önce kitap adını gir</p>}
              </div>

              {/* Metin modu: içerik yapıştır (gizli tutulan kısım) */}
              {uploadMode === 'text' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Kitap Metni</label>
                  <textarea className="input" value={content} onChange={e => setContent(e.target.value)} onBlur={e => generateDescription(e.target.value)} placeholder="Kitap metnini buraya yapıştır..." rows={3} style={{ resize: 'none', lineHeight: 1.6, fontSize: '0.82rem' }} />
                </div>
              )}

              {content && (
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.9rem', background: 'rgba(67,233,123,0.1)', borderRadius: '10px', border: '1px solid rgba(67,233,123,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                    ✓ {content.split(/\s+/).filter(Boolean).length.toLocaleString()} kelime · ~{Math.ceil(content.split(/\s+/).filter(Boolean).length / 300)} sayfa
                  </span>
                </div>
              )}

              {/* Açıklama (AI üretir, kullanıcı düzenleyebilir) */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Açıklama</label>
                  {infoLoading && <span style={{ fontSize: '0.68rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> Yazıyor...</span>}
                  {!infoLoading && (content || uploadMode === 'pdf') && (
                    <button onClick={() => generateDescription(content)} style={{ fontSize: '0.68rem', color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', padding: 0 }}>
                      <RefreshCw size={10} /> Yeniden üret
                    </button>
                  )}
                </div>
                <textarea
                  className="input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={infoLoading ? 'AI yazıyor...' : 'Kitap yüklendikten sonra AI otomatik yazar, ya da kendin yaz...'}
                  rows={3}
                  style={{ resize: 'none', lineHeight: 1.6, fontSize: '0.85rem', maxHeight: '110px', overflowY: 'auto' }}
                />
              </div>

              {/* Kategori */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Kategori</label>
                  <button onClick={autoClassify} disabled={classifyLoading || !title.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1.5px solid var(--border)', background: 'transparent', color: classifyLoading ? 'var(--text-muted)' : 'var(--accent)', fontSize: '0.73rem', fontWeight: 600, cursor: classifyLoading || !title.trim() ? 'not-allowed' : 'pointer', opacity: !title.trim() ? 0.5 : 1 }}>
                    {classifyLoading ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                    {classifyLoading ? 'Analiz...' : 'AI ile Sınıflandır'}
                  </button>
                </div>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {BOOK_CATEGORIES.filter(c => c.id !== 'all').map(c => {
                    const sel = selectedCategories.includes(c.id)
                    return (
                      <button key={c.id} onClick={() => toggleCategory(c.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '999px', border: `2px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent)' : 'transparent', color: sel ? 'white' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: sel ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', boxShadow: sel ? '0 2px 8px rgba(64,93,230,0.35)' : 'none' }}>
                        <span>{c.icon}</span>
                        {sel && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                        {c.label}
                      </button>
                    )
                  })}
                </div>
                {selectedCategories.length > 0 && (
                  <div style={{ marginTop: '0.45rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '0.1rem' }}>Seçilen:</span>
                    {selectedCategories.map(id => {
                      const cat = BOOK_CATEGORIES.find(c => c.id === id)
                      return cat ? (
                        <span key={id} style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '0.1rem 0.45rem', borderRadius: '999px', fontWeight: 600 }}>
                          {cat.icon} {cat.label}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              {/* Görünürlük / Paylaşım */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Kimler görebilir?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {VISIBILITY_OPTIONS.map(opt => {
                    const Icon = opt.icon
                    const active = visibility === opt.id
                    return (
                      <button key={opt.id} onClick={() => setVisibility(opt.id)} style={{ padding: '0.75rem', borderRadius: '12px', border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'rgba(64,93,230,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Icon size={14} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text)' }}>{opt.label}</span>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{opt.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {saveError && (
                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <p style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>{saveError}</p>
                </div>
              )}
            </div>

            {/* Sticky buton */}
            <div style={{ padding: '1rem 1.5rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <button onClick={handleAdd} disabled={saving || !title.trim() || pdfParsing} className="btn-primary" style={{ width: '100%', padding: '0.95rem', borderRadius: '14px', fontSize: '0.95rem', opacity: saving || !title.trim() || pdfParsing ? 0.5 : 1 }}>
                {saving ? (saveStep || 'Kaydediliyor...') : pdfParsing ? `PDF Okunuyor... %${pdfProgress}` : 'Kütüphaneye Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <BottomNav />
    </main>
  )
}
