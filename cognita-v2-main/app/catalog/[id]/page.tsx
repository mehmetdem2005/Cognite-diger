'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { ArrowLeft, BookOpen, BookMarked, Globe, BarChart2, Clock, Send } from 'lucide-react'
import { interaction } from '@/lib/interaction'
import BookCover from '@/components/ui/BookCover'
import { BOOK_CATEGORIES } from '@/lib/categories'
import { cognitaAPI } from '@/lib/api'

interface CatalogBook {
  id: string; title: string; author: string | null; cover_url: string | null
  description: string | null; categories: string[]; language: string; level: string | null
  total_pages: number; is_published: boolean
}
interface Comment { id: string; content: string; created_at: string; profiles: { username: string | null } }
interface Analysis { summary: string; themes: string[]; concepts: string[]; mood: string; difficulty: string; target_audience: string }

const GRADIENTS = [
  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
  'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
  'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
  'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
]
const LANG_MAP: Record<string, string> = {
  tr: '🇹🇷 Türkçe', en: '🇬🇧 İngilizce', ru: '🇷🇺 Rusça',
  de: '🇩🇪 Almanca', fr: '🇫🇷 Fransızca', es: '🇪🇸 İspanyolca',
  ar: '🇸🇦 Arapça', it: '🇮🇹 İtalyanca', pt: '🇵🇹 Portekizce',
}
const LEVEL_COLOR: Record<string, string> = {
  A1: '#22c55e', A2: '#84cc16', B1: '#f59e0b', B2: '#f97316', C1: '#ef4444', C2: '#a855f7',
}

export default function CatalogBookPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [book, setBook] = useState<CatalogBook | null>(null)
  const [userBookId, setUserBookId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [activeTab, setActiveTab] = useState<'comments'|'chat'|'analysis'>('comments')
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role:'user'|'ai';text:string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [activeProviderName, setActiveProviderName] = useState<string>('')
  const [activeProviderDisplay, setActiveProviderDisplay] = useState<string>('')
  const [groqModel, setGroqModel] = useState<'fast' | 'quality'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('groq_model') as 'fast' | 'quality') || 'fast'
    return 'fast'
  })

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user && id) { fetchBook(); checkAdded() } }, [user, id])
  useEffect(() => { if (userBookId) fetchComments() }, [userBookId])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  useEffect(() => { if (activeTab === 'chat' && !activeProviderDisplay) fetchActiveProvider() }, [activeTab])

  const fetchBook = async () => {
    const { data } = await supabase
      .from('catalog_books')
      .select('id, title, author, cover_url, description, categories, language, level, total_pages, is_published')
      .eq('id', id).single()
    setBook(data)
    setFetching(false)
  }

  const fetchComments = async () => {
    // Yorumlar kullanıcının kütüphanesindeki kitaba bağlı
    if (!userBookId) return
    const { data } = await supabase
      .from('comments').select('*, profiles(username)')
      .eq('book_id', userBookId)
      .order('created_at', { ascending: false })
    setComments(data || [])
  }

  const checkAdded = async () => {
    const { data: ucb } = await supabase.from('user_catalog_books').select('id').eq('catalog_book_id', id).eq('user_id', user!.id).single()
    if (!ucb) return
    const { data: catalogBook } = await supabase.from('catalog_books').select('title').eq('id', id).single()
    if (!catalogBook) return
    const { data: bk } = await supabase.from('books').select('id').eq('user_id', user!.id).eq('title', catalogBook.title).single()
    if (bk) setUserBookId(bk.id)
  }

  const handleRead = async () => {
    if (!book || !user) return
    if (userBookId) { router.push(`/reader/${userBookId}`); return }
    setAdding(true)
    const { data: inserted } = await supabase.from('books').insert({
      user_id: user.id, title: book.title, author: book.author,
      cover_url: book.cover_url, file_type: 'catalog',
      total_pages: book.total_pages, is_public: false, tags: book.categories,
    }).select().single()
    if (inserted) {
      const { data: catalogData } = await supabase.from('catalog_books').select('content').eq('id', book.id).single()
      if (catalogData?.content) localStorage.setItem(`book_content_${inserted.id}`, catalogData.content)
      await supabase.from('user_catalog_books').insert({ user_id: user.id, catalog_book_id: book.id })
      interaction.success()
      setUserBookId(inserted.id)
      router.push(`/reader/${inserted.id}`)
    }
    setAdding(false)
  }

  const handleComment = async () => {
    if (!newComment.trim() || !user || !userBookId) return
    setSending(true)
    await supabase.from('comments').insert({ user_id: user.id, book_id: userBookId, content: newComment.trim() })
    interaction.success()
    setNewComment('')
    fetchComments()
    setSending(false)
  }

  const fetchActiveProvider = async () => {
    try {
      const res = await fetch('/api/ai/active-provider')
      const data = await res.json()
      setActiveProviderName(data.name || '')
      setActiveProviderDisplay(data.displayName || '')
    } catch {}
  }

  const handleGroqModelChange = (m: 'fast' | 'quality') => {
    setGroqModel(m)
    localStorage.setItem('groq_model', m)
  }

  const handleChat = async () => {
    if (!chatInput.trim() || !book) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const content = localStorage.getItem(`book_content_${userBookId}`) || book.description || ''
      const data = await cognitaAPI.chatWithBook(userMsg, content, book.title, groqModel)
      if (data.activeProviderName) setActiveProviderName(data.activeProviderName)
      if (data.activeProvider) setActiveProviderDisplay(data.activeProvider)
      setChatMessages(prev => [...prev, { role: 'ai', text: data.response }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Backend şu an uyanıyor olabilir (50sn bekle), tekrar dene.' }])
    }
    setChatLoading(false)
  }

  const handleAnalysis = async () => {
    setActiveTab('analysis')
    if (analysis) return
    setAnalysisLoading(true)
    try {
      const content = (userBookId && localStorage.getItem(`book_content_${userBookId}`)) || book?.description || book?.title || ''
      const data = await cognitaAPI.analyzeBook(content, book?.title || '')
      setAnalysis(data)
    } catch (err: any) {
      const msg = err?.message || 'Analiz yapılamadı'
      setAnalysis({ summary: msg, themes: [], concepts: [], mood: '-', difficulty: '-', target_audience: '-' })
    }
    setAnalysisLoading(false)
  }

  if (loading || fetching) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  if (!book) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <BookOpen size={40} color="var(--text-muted)" />
      <p style={{ color: 'var(--text-muted)' }}>Kitap bulunamadı.</p>
      <button onClick={() => router.back()} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}>Geri Dön</button>
    </main>
  )

  const readingTime = Math.round(book.total_pages * 1.5)
  const langLabel = LANG_MAP[book.language] || book.language?.toUpperCase()
  const levelColor = book.level ? (LEVEL_COLOR[book.level] || 'var(--accent)') : 'var(--accent)'
  const color = GRADIENTS[book.title.charCodeAt(0) % GRADIENTS.length]
  const catLabels = (book.categories || []).map(cid => BOOK_CATEGORIES.find(c => c.id === cid)).filter(Boolean)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: '300px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '-10px', background: book.cover_url ? `url(${book.cover_url}) center/cover no-repeat` : color, filter: 'blur(24px) brightness(0.4) saturate(1.4)', transform: 'scale(1.15)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)' }} />
        <button onClick={() => router.back()} style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '999px', padding: '0.45rem 0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Geri
        </button>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(10px)', borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
          📚 Katalog
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1rem' }}>
          <BookCover title={book.title} coverUrl={book.cover_url} width={130} height={185} borderRadius={12} style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.12)' }} />
        </div>
      </div>

      {/* ── Book info ── */}
      <div style={{ padding: '1.25rem 1.25rem 1.1rem', textAlign: 'center', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, marginBottom: '0.3rem' }}>{book.title}</h1>
        {book.author && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.9rem' }}>{book.author}</p>}
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {langLabel && <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: '999px', background: 'rgba(64,93,230,0.1)', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Globe size={12} /> {langLabel}</span>}
          {book.level && <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: '999px', background: `${levelColor}18`, color: levelColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BarChart2 size={12} /> {book.level}</span>}
          {book.total_pages > 0 && <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: '999px', background: 'var(--bg-soft)', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BookOpen size={12} /> {book.total_pages} sayfa</span>}
          {readingTime > 0 && <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: '999px', background: 'var(--bg-soft)', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> ~{readingTime < 60 ? `${readingTime} dk` : `${Math.floor(readingTime/60)} sa`}</span>}
        </div>
      </div>

      {/* ── Description ── */}
      {book.description && (
        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Hakkında</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.7 }}>{book.description}</p>
        </div>
      )}

      {/* ── Categories ── */}
      {catLabels.length > 0 && (
        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>Kategoriler</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {catLabels.map(c => (
              <span key={c!.id} style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', borderRadius: '999px', background: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {c!.icon} {c!.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        {[
          { id: 'comments', label: '💬 Yorumlar' },
          { id: 'chat', label: '🤖 AI Sohbet' },
          { id: 'analysis', label: '🧠 Analiz' },
        ].map(tab => (
          <button key={tab.id} onClick={() => tab.id === 'analysis' ? handleAnalysis() : setActiveTab(tab.id as any)} style={{ flex: 1, padding: '0.8rem 0.4rem', background: 'transparent', border: 'none', borderBottom: `2.5px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '1rem' }}>

        {activeTab === 'comments' && (
          !userBookId ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <p className="empty-state-title">Yorum yapmak için kitabı ekle</p>
              <p className="empty-state-desc">Aşağıdaki butona basarak kitabı kütüphanene ekle, ardından yorum yapabilirsin.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.1rem' }}>
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Düşüncelerini paylaş..." rows={3} className="input" style={{ marginBottom: '0.6rem', resize: 'none' }} />
                <button onClick={handleComment} disabled={sending || !newComment.trim()} className="btn-primary" style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: sending || !newComment.trim() ? 0.5 : 1 }}>
                  <Send size={14} /> {sending ? 'Gönderiliyor...' : 'Yorum Yap'}
                </button>
              </div>
              {comments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <p className="empty-state-title">Henüz yorum yok</p>
                  <p className="empty-state-desc">İlk yorumu sen yap!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {comments.map(c => (
                    <div key={c.id} className="card" style={{ padding: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>@{c.profiles?.username || 'anonim'}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-soft)' }}>{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(64,93,230,0.08)', borderRadius: '12px', border: '1px solid rgba(64,93,230,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.2rem' }}>🤖 AI Kitap Asistanı</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Bu kitap hakkında her şeyi sorabilirsin.</p>
                </div>
                {activeProviderDisplay && (
                  <span style={{ fontSize: '0.66rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(64,93,230,0.12)', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {activeProviderDisplay}
                  </span>
                )}
              </div>
              {activeProviderName === 'groq' && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                  <button
                    onClick={() => handleGroqModelChange('fast')}
                    style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '8px', border: `1.5px solid ${groqModel === 'fast' ? 'var(--accent)' : 'var(--border)'}`, background: groqModel === 'fast' ? 'rgba(64,93,230,0.1)' : 'transparent', color: groqModel === 'fast' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.72rem', fontWeight: groqModel === 'fast' ? 700 : 400, cursor: 'pointer' }}
                  >
                    ⚡ Hızlı Mod <span style={{ opacity: 0.6, fontWeight: 400 }}>(8B)</span>
                  </button>
                  <button
                    onClick={() => handleGroqModelChange('quality')}
                    style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '8px', border: `1.5px solid ${groqModel === 'quality' ? 'var(--accent)' : 'var(--border)'}`, background: groqModel === 'quality' ? 'rgba(64,93,230,0.1)' : 'transparent', color: groqModel === 'quality' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.72rem', fontWeight: groqModel === 'quality' ? 700 : 400, cursor: 'pointer' }}
                  >
                    🎯 Kaliteli Mod <span style={{ opacity: 0.6, fontWeight: 400 }}>(70B)</span>
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '200px', maxHeight: '420px', overflowY: 'auto' }}>
              {chatMessages.length === 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['Ana tema nedir?', 'Karakterleri anlat', 'Önemli alıntılar'].map(q => (
                    <button key={q} onClick={() => setChatInput(q)} style={{ padding: '0.35rem 0.75rem', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: '999px', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>{q}</button>
                  ))}
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '82%', padding: '0.7rem 1rem', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,var(--accent),var(--accent-2,#764ba2))' : 'var(--bg-card)', border: `1px solid ${msg.role === 'user' ? 'transparent' : 'var(--border)'}`, color: msg.role === 'user' ? 'white' : 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex' }}>
                  <div style={{ padding: '0.7rem 1rem', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0,1,2].map(i => <div key={i} className="skeleton" style={{ width: '7px', height: '7px', borderRadius: '50%', animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Kitap hakkında sor..." onKeyDown={e => e.key === 'Enter' && handleChat()} style={{ flex: 1 }} />
              <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 1rem', background: 'linear-gradient(135deg,var(--accent),var(--accent-2,#764ba2))', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', flexShrink: 0, opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          analysisLoading ? (
            <div className="empty-state">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧠</div>
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>AI analiz yapıyor...</p>
            </div>
          ) : analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Özet</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-soft)' }}>{analysis.summary}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {[{ label: 'Atmosfer', value: analysis.mood }, { label: 'Zorluk', value: analysis.difficulty }, { label: 'Hedef', value: analysis.target_audience }].map(s => (
                  <div key={s.label} className="card-soft" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{s.label}</p>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {analysis.themes?.length > 0 && (
                <div className="card" style={{ padding: '1rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Temalar</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {analysis.themes.map((t, i) => <span key={i} className="tag tag-accent">{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🧠</div>
              <p className="empty-state-title">Analiz hazırlanıyor...</p>
            </div>
          )
        )}
      </div>

      {/* ── Fixed bottom CTA ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))', background: 'var(--nav-bg)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <button onClick={handleRead} disabled={adding} className="btn-primary" style={{ width: '100%', padding: '1rem', borderRadius: '16px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: adding ? 0.7 : 1 }}>
          {adding ? 'Kütüphaneye ekleniyor...' : userBookId
            ? <><BookOpen size={18} /> Okumaya Devam Et</>
            : <><BookMarked size={18} /> Kütüphaneye Ekle &amp; Oku</>
          }
        </button>
      </div>
    </main>
  )
}
