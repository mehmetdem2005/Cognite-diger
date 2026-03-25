'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { ArrowLeft, Heart, BookOpen, Send, Brain, Share2, Star, Bookmark, Clock, FileText, Hash } from 'lucide-react'
import { cognitaAPI } from '@/lib/api'
import BookCover from '@/components/ui/BookCover'
import { interaction } from '@/lib/interaction'

interface Book {
  id: string; title: string; author: string | null; description: string | null
  total_pages: number; cover_url?: string | null; tags: string[]; language: string
  avg_rating: number; rating_count: number; created_at: string
  profiles: { username: string | null }
}
interface Comment { id: string; content: string; created_at: string; profiles: { username: string | null } }
interface Analysis { summary: string; themes: string[]; concepts: string[]; mood: string; difficulty: string; target_audience: string }

const LEVEL_COLORS: Record<string, string> = { A1: '#22c55e', A2: '#86efac', B1: '#f59e0b', B2: '#f97316', C1: '#ef4444', C2: '#dc2626' }

export default function BookDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [book, setBook] = useState<Book | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [readingSession, setReadingSession] = useState<{ current_page: number; progress_percent: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'comments' | 'chat' | 'analysis'>('comments')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [activeProviderDisplay, setActiveProviderDisplay] = useState('')
  const [activeProviderName, setActiveProviderName] = useState('')
  const [groqModel, setGroqModel] = useState<'fast' | 'quality'>('fast')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => {
    if (user && id) {
      fetchBook(); fetchComments(); checkLike(); checkSaved(); fetchSession()
      const saved = localStorage.getItem('groq_model')
      if (saved) setGroqModel(saved as any)
    }
  }, [user, id])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  useEffect(() => { if (activeTab === 'chat' && !activeProviderDisplay) fetchActiveProvider() }, [activeTab])

  const fetchBook = async () => {
    const { data } = await supabase.from('books').select('*, profiles(username)').eq('id', id).single()
    setBook(data)
  }
  const fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*, profiles(username)').eq('book_id', id).order('created_at', { ascending: false })
    setComments(data || [])
  }
  const checkLike = async () => {
    const { data } = await supabase.from('likes').select('id').eq('user_id', user!.id).eq('target_id', id).eq('target_type', 'book').single()
    setLiked(!!data)
  }
  const checkSaved = async () => {
    const { data } = await supabase.from('likes').select('id').eq('user_id', user!.id).eq('target_id', id).eq('target_type', 'book_saved').single()
    setSaved(!!data)
  }
  const fetchSession = async () => {
    const { data } = await supabase.from('reading_sessions').select('current_page, progress_percent').eq('book_id', id).eq('user_id', user!.id).single()
    if (data) setReadingSession(data)
  }
  const fetchActiveProvider = async () => {
    try {
      const res = await fetch('/api/ai/active-provider')
      const data = await res.json()
      setActiveProviderName(data.name || '')
      setActiveProviderDisplay(data.displayName || '')
    } catch {}
  }

  const handleComment = async () => {
    if (!newComment.trim() || !user) return
    setSending(true)
    await supabase.from('comments').insert({ user_id: user.id, book_id: id, content: newComment.trim() })
    interaction.success()
    setNewComment(''); fetchComments(); setSending(false)
  }

  const handleLike = async () => {
    interaction.like()
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user!.id).eq('target_id', id).eq('target_type', 'book')
    } else {
      await supabase.from('likes').insert({ user_id: user!.id, target_id: id, target_type: 'book' })
    }
    setLiked(!liked)
  }

  const handleSave = async () => {
    interaction.bookmark()
    if (saved) {
      await supabase.from('likes').delete().eq('user_id', user!.id).eq('target_id', id).eq('target_type', 'book_saved')
    } else {
      await supabase.from('likes').insert({ user_id: user!.id, target_id: id, target_type: 'book_saved' })
    }
    setSaved(!saved)
  }

  const handleChat = async () => {
    if (!chatInput.trim() || !book) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const bookContent = localStorage.getItem(`book_content_${id}`) || book.description || ''
      const data = await cognitaAPI.chatWithBook(userMsg, bookContent, book.title, groqModel)
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
      const bookContent = localStorage.getItem(`book_content_${id}`) || book?.description || book?.title || ''
      const data = await cognitaAPI.analyzeBook(bookContent, book?.title || '')
      setAnalysis(data)
    } catch (err: any) {
      setAnalysis({ summary: err?.message || 'Analiz yapılamadı', themes: [], concepts: [], mood: '-', difficulty: '-', target_audience: '-' })
    }
    setAnalysisLoading(false)
  }

  const readingTime = book ? Math.round((book.total_pages || 0) * 1.5) : 0

  if (loading || !user || !book) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>

      {/* Hero — kapak + blur arka plan */}
      <div style={{ position: 'relative', height: '320px', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: '-20px',
          background: book.cover_url
            ? `url(${book.cover_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, #667EEA, #764BA2)',
          filter: 'blur(28px) brightness(0.4) saturate(1.5)',
          transform: 'scale(1.2)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Geri butonu */}
        <button onClick={() => router.back()} style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: 999, padding: '0.45rem 0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Geri
        </button>

        {/* Kapak */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1.5rem' }}>
          <BookCover title={book.title} coverUrl={book.cover_url} width={130} height={185} borderRadius={12} style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.15)' }} />
        </div>
      </div>

      {/* Kitap bilgisi */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1.25rem 1.25rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, marginBottom: '0.3rem' }}>{book.title}</h1>
        {book.author && <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', marginBottom: '0.3rem' }}>{book.author}</p>}
        <p style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.75rem' }}>@{(book as any).profiles?.username || 'anonim'}</p>

        {/* Meta bilgiler */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {book.total_pages > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <FileText size={13} color="var(--text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{book.total_pages} sayfa</span>
            </div>
          )}
          {readingTime > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={13} color="var(--text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {readingTime < 60 ? `${readingTime} dk` : `${Math.floor(readingTime / 60)} sa`}
              </span>
            </div>
          )}
          {book.language && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Hash size={13} color="var(--text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{book.language.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Etiketler */}
        {book.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
            {book.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="tag">{tag}</span>
            ))}
          </div>
        )}

        {/* İlerleme (varsa) */}
        {readingSession && readingSession.progress_percent > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Okuma İlerlemeniz</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)' }}>%{Math.round(readingSession.progress_percent)}</span>
            </div>
            <div style={{ height: '4px', background: 'var(--bg-soft)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${readingSession.progress_percent}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 2 }} />
            </div>
          </div>
        )}

        {/* Aksiyon butonları */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push(`/reader/${book.id}`)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.8rem', background: 'var(--text)', border: 'none', borderRadius: 14, color: 'var(--bg)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
            <BookOpen size={17} />
            {readingSession && readingSession.progress_percent > 0 ? 'Devam Et' : 'Oku'}
          </button>
          <button onClick={handleLike}
            style={{ padding: '0.8rem 1rem', background: liked ? 'rgba(230,57,70,0.1)' : 'var(--bg-soft)', border: `1.5px solid ${liked ? '#e63946' : 'var(--border)'}`, borderRadius: 14, color: liked ? '#e63946' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.18s' }}>
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button onClick={handleSave}
            style={{ padding: '0.8rem 1rem', background: saved ? 'rgba(64,93,230,0.1)' : 'var(--bg-soft)', border: `1.5px solid ${saved ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, color: saved ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.18s' }}>
            <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button onClick={handleAnalysis}
            style={{ padding: '0.8rem 1rem', background: activeTab === 'analysis' ? 'rgba(64,93,230,0.1)' : 'var(--bg-soft)', border: `1.5px solid ${activeTab === 'analysis' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, color: activeTab === 'analysis' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
        <Brain size={18} />
          </button>
          <button onClick={() => navigator.share?.({ title: book.title, url: window.location.href })}
            style={{ padding: '0.8rem 1rem', background: 'var(--bg-soft)', border: '1.5px solid var(--border)', borderRadius: 14, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Share2 size={18} />
          </button>
        </div>

        {/* Puanlama */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', marginTop: '0.9rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Puan ver:</span>
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onClick={() => setUserRating(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', transition: 'transform 0.1s' }}>
              <Star size={20} fill={s <= userRating ? '#f59e0b' : 'none'} color={s <= userRating ? '#f59e0b' : 'var(--border)'} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      {/* Açıklama */}
      {book.description && (
        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Hakkında</p>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>{book.description}</p>
        </div>
      )}

      {/* Sekmeler */}
      <div style={{ display: 'flex', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        {[
          { id: 'comments', label: '💬 Yorumlar' },
          { id: 'chat', label: '🤖 AI Sohbet' },
          { id: 'analysis', label: '🧠 Analiz' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => tab.id === 'analysis' ? handleAnalysis() : setActiveTab(tab.id as any)}
            style={{ flex: 1, padding: '0.8rem 0.4rem', background: 'none', border: 'none', borderBottom: `2.5px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer', transition: 'color 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sekme içerikleri */}
      <div style={{ padding: '1rem' }}>

        {activeTab === 'comments' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Düşüncelerini paylaş..." rows={3} className="input" style={{ marginBottom: '0.6rem', resize: 'none' }} />
              <button onClick={handleComment} disabled={sending || !newComment.trim()} className="btn-primary"
                style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: sending || !newComment.trim() ? 0.5 : 1 }}>
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
                    <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-soft)' }}>{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(64,93,230,0.08)', borderRadius: 12, border: '1px solid rgba(64,93,230,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.15rem' }}>🤖 AI Kitap Asistanı</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bu kitap hakkında her şeyi sorabilirsin.</p>
                </div>
                {activeProviderDisplay && (
                  <span style={{ fontSize: '0.66rem', padding: '0.2rem 0.5rem', borderRadius: 999, background: 'rgba(64,93,230,0.12)', color: 'var(--accent)', fontWeight: 600 }}>{activeProviderDisplay}</span>
                )}
              </div>
              {activeProviderName === 'groq' && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                  {(['fast', 'quality'] as const).map(m => (
                    <button key={m} onClick={() => { setGroqModel(m); localStorage.setItem('groq_model', m) }}
                      style={{ flex: 1, padding: '0.35rem', borderRadius: 8, border: `1.5px solid ${groqModel === m ? 'var(--accent)' : 'var(--border)'}`, background: groqModel === m ? 'rgba(64,93,230,0.1)' : 'transparent', color: groqModel === m ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.72rem', fontWeight: groqModel === m ? 700 : 400, cursor: 'pointer' }}>
                      {m === 'fast' ? '⚡ Hızlı (8B)' : '🎯 Kaliteli (70B)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
              {chatMessages.length === 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['Ana tema nedir?', 'Karakterleri anlat', 'Önemli alıntılar', 'Kitabı özetle'].map(q => (
                    <button key={q} onClick={() => setChatInput(q)}
                      style={{ padding: '0.35rem 0.75rem', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 999, fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '82%', padding: '0.7rem 1rem', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--bg-card)', border: `1px solid ${msg.role === 'user' ? 'transparent' : 'var(--border)'}`, color: msg.role === 'user' ? 'white' : 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex' }}>
                  <div style={{ padding: '0.7rem 1rem', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ width: 7, height: 7, borderRadius: '50%', animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Kitap hakkında sor..." onKeyDown={e => e.key === 'Enter' && handleChat()} style={{ flex: 1 }} />
              <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
                style={{ padding: '0 1rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', border: 'none', borderRadius: 12, color: 'white', cursor: 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
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
                <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: 'var(--text-soft)' }}>{analysis.summary}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {[{ l: 'Atmosfer', v: analysis.mood }, { l: 'Zorluk', v: analysis.difficulty }, { l: 'Hedef Kitle', v: analysis.target_audience }].map(s => (
                  <div key={s.l} className="card-soft" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{s.l}</p>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{s.v}</p>
                  </div>
                ))}
              </div>
              {analysis.themes?.length > 0 && (
                <div className="card" style={{ padding: '1rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Temalar</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {analysis.themes.map((t, i) => <span key={i} className="tag tag-accent">{t}</span>)}
                  </div>
                </div>
              )}
              {analysis.concepts?.length > 0 && (
                <div className="card" style={{ padding: '1rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Kavramlar</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {analysis.concepts.map((c, i) => <span key={i} className="tag">{c}</span>)}
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

      <BottomNav />
    </main>
  )
}
