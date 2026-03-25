'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { ArrowLeft, Save, Eye, EyeOff, Trash2, Plus, Wand2, Send, X } from 'lucide-react'
import { cognitaAPI } from '@/lib/api'

interface Story { id: string; title: string; is_published: boolean }
interface Chapter { id: string; title: string; content: string; chapter_number: number; is_published: boolean }

export default function StoryEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [story, setStory] = useState<Story | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [active, setActive] = useState<Chapter | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNewChapter, setShowNewChapter] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [activeProviderName, setActiveProviderName] = useState<string>('')
  const [activeProviderDisplay, setActiveProviderDisplay] = useState<string>('')
  const [writerFeatures, setWriterFeatures] = useState({
    aiAssistEnabled: true,
    autoSaveIntervalSec: 20,
  })
  const [groqModel, setGroqModel] = useState<'fast' | 'quality'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('groq_model') as 'fast' | 'quality') || 'fast'
    return 'fast'
  })

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user && id) { fetchStory(); fetchChapters(); fetchWriterFeatures() } }, [user, id])
  useEffect(() => { if (active) setWordCount(active.content.split(/\s+/).filter(Boolean).length) }, [active?.content])
  useEffect(() => { if (showAI && writerFeatures.aiAssistEnabled && !activeProviderDisplay) fetchActiveProvider() }, [showAI, writerFeatures.aiAssistEnabled])

  useEffect(() => {
    if (!active?.id || !active?.content) return
    const intervalSec = Math.max(10, writerFeatures.autoSaveIntervalSec || 20)
    const timer = setTimeout(async () => {
      await supabase.from('story_chapters').update({ title: active.title, content: active.content }).eq('id', active.id)
    }, intervalSec * 1000)

    return () => clearTimeout(timer)
  }, [active?.id, active?.title, active?.content, writerFeatures.autoSaveIntervalSec])

  const fetchWriterFeatures = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['writer_ai_assist_enabled', 'writer_auto_save_interval_sec'])

      const map = new Map((data || []).map(item => [item.key, item.value]))
      setWriterFeatures({
        aiAssistEnabled: map.get('writer_ai_assist_enabled') !== '0',
        autoSaveIntervalSec: Math.max(10, Number(map.get('writer_auto_save_interval_sec') || 20)),
      })
    } catch {}
  }

  const fetchStory = async () => {
    const { data } = await supabase.from('stories').select('*').eq('id', id).single()
    setStory(data)
  }

  const fetchChapters = async () => {
    const { data } = await supabase.from('story_chapters').select('*').eq('story_id', id).order('chapter_number')
    setChapters(data || [])
    if (data?.length && !active) setActive(data[0])
  }

  const handleSave = async () => {
    if (!active) return
    setSaving(true)
    await supabase.from('story_chapters').update({ title: active.title, content: active.content }).eq('id', active.id)
    setSaving(false)
  }

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return
    const { data } = await supabase.from('story_chapters').insert({
      story_id: id, title: newChapterTitle.trim(),
      content: '', chapter_number: chapters.length + 1, is_published: false,
    }).select().single()
    setNewChapterTitle(''); setShowNewChapter(false)
    fetchChapters()
    if (data) setActive(data)
  }

  const handleDelete = async (chId: string) => {
    if (!confirm('Bölümü sil?')) return
    await supabase.from('story_chapters').delete().eq('id', chId)
    if (active?.id === chId) setActive(null)
    fetchChapters()
  }

  const handleTogglePublish = async (ch: Chapter) => {
    await supabase.from('story_chapters').update({ is_published: !ch.is_published }).eq('id', ch.id)
    if (active?.id === ch.id) setActive({ ...active, is_published: !ch.is_published })
    fetchChapters()
  }

  const handleToggleStory = async () => {
    if (!story) return
    await supabase.from('stories').update({ is_published: !story.is_published }).eq('id', id)
    setStory({ ...story, is_published: !story.is_published })
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

  const handleAI = async () => {
    if (!aiPrompt.trim() || !active) return
    setAiLoading(true)
    try {
      const contextText = `Hikaye: ${story?.title}\nBölüm: ${active.title}\nMevcut içerik: ${active.content.slice(0, 1000)}\n\nİstek: ${aiPrompt}`
      const data = await cognitaAPI.writingAssistant(contextText, groqModel)
      if (data.activeProviderName) setActiveProviderName(data.activeProviderName)
      if (data.activeProvider) setActiveProviderDisplay(data.activeProvider)
      setAiResponse(data.response)
    } catch {
      setAiResponse('AI şu an yanıt veremiyor.')
    }
    setAiLoading(false)
  }

  const insertAIText = () => {
    if (!active || !aiResponse) return
    setActive({ ...active, content: active.content + '\n\n' + aiResponse })
    setAiResponse(''); setAiPrompt(''); setShowAI(false)
  }

  const AI_PROMPTS = ['Bu bölümü devam ettir', 'Karakteri daha canlı anlat', 'Diyalog ekle', 'Gerilim oluştur', 'Sahneyi betimle', 'Hataları düzelt']

  if (loading || !user || !story) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.push('/write')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.title}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{wordCount} kelime</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {writerFeatures.aiAssistEnabled && (
            <button onClick={() => setShowAI(!showAI)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', background: showAI ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : 'var(--bg-soft)', border: 'none', borderRadius: '8px', color: showAI ? 'white' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              <Wand2 size={14} /> AI
            </button>
          )}
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', background: 'var(--text)', border: 'none', borderRadius: '8px', color: 'var(--bg)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            <Save size={14} /> {saving ? '...' : 'Kaydet'}
          </button>
          <button onClick={handleToggleStory} style={{ padding: '0.4rem 0.75rem', background: story.is_published ? 'rgba(230,57,70,0.1)' : 'rgba(67,233,123,0.15)', border: 'none', borderRadius: '8px', color: story.is_published ? 'var(--red)' : '#16a34a', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            {story.is_published ? 'Gizle' : 'Yayınla'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 54px)' }}>
        <div style={{ width: '150px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bölümler</span>
            <button onClick={() => setShowNewChapter(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}><Plus size={16} /></button>
          </div>
          {showNewChapter && (
            <div style={{ padding: '0.5rem' }}>
              <input className="input" value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} placeholder="Bölüm adı" style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }} onKeyDown={e => e.key === 'Enter' && handleAddChapter()} />
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={handleAddChapter} style={{ flex: 1, padding: '0.3rem', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.72rem', cursor: 'pointer' }}>Ekle</button>
                <button onClick={() => setShowNewChapter(false)} style={{ flex: 1, padding: '0.3rem', background: 'var(--bg-soft)', border: 'none', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}>İptal</button>
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chapters.map(ch => (
              <div key={ch.id} onClick={() => setActive(ch)} style={{ padding: '0.6rem 0.75rem', cursor: 'pointer', background: active?.id === ch.id ? 'rgba(64,93,230,0.1)' : 'transparent', borderLeft: `3px solid ${active?.id === ch.id ? 'var(--accent)' : 'transparent'}` }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 500, color: active?.id === ch.id ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.1rem' }}>{ch.chapter_number}. {ch.title}</p>
                <p style={{ fontSize: '0.62rem', color: ch.is_published ? '#16a34a' : 'var(--text-muted)' }}>{ch.is_published ? '● Yayında' : '○ Taslak'}</p>
              </div>
            ))}
            {chapters.length === 0 && <p style={{ padding: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>Bölüm yok</p>}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {active ? (
            <>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-card)' }}>
                <input value={active.title} onChange={e => setActive({ ...active, title: e.target.value })} style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '1.1rem', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)' }} />
                <button onClick={() => handleTogglePublish(active)} style={{ padding: '0.3rem 0.6rem', background: active.is_published ? 'rgba(230,57,70,0.1)' : 'rgba(67,233,123,0.1)', border: 'none', borderRadius: '6px', color: active.is_published ? 'var(--red)' : '#16a34a', fontSize: '0.7rem', cursor: 'pointer' }}>
                  {active.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => handleDelete(active.id)} style={{ padding: '0.3rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
              </div>

              {showAI && writerFeatures.aiAssistEnabled && (
                <div style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>🤖 AI Yazma Asistanı</span>
                    {activeProviderDisplay && (
                      <span style={{ fontSize: '0.66rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(64,93,230,0.12)', color: 'var(--accent)', fontWeight: 600 }}>
                        {activeProviderDisplay}
                      </span>
                    )}
                  </div>
                  {activeProviderName === 'groq' && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <button
                        onClick={() => handleGroqModelChange('fast')}
                        style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '8px', border: `1.5px solid ${groqModel === 'fast' ? 'var(--accent)' : 'var(--border)'}`, background: groqModel === 'fast' ? 'rgba(64,93,230,0.1)' : 'transparent', color: groqModel === 'fast' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: groqModel === 'fast' ? 700 : 400, cursor: 'pointer' }}
                      >
                        ⚡ Hızlı <span style={{ opacity: 0.6, fontWeight: 400 }}>(8B)</span>
                      </button>
                      <button
                        onClick={() => handleGroqModelChange('quality')}
                        style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '8px', border: `1.5px solid ${groqModel === 'quality' ? 'var(--accent)' : 'var(--border)'}`, background: groqModel === 'quality' ? 'rgba(64,93,230,0.1)' : 'transparent', color: groqModel === 'quality' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: groqModel === 'quality' ? 700 : 400, cursor: 'pointer' }}
                      >
                        🎯 Kaliteli <span style={{ opacity: 0.6, fontWeight: 400 }}>(70B)</span>
                      </button>
                    </div>
                  )}
                  <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.6rem' }}>
                    {AI_PROMPTS.map(p => (
                      <button key={p} onClick={() => setAiPrompt(p)} style={{ flexShrink: 0, padding: '0.25rem 0.65rem', borderRadius: '999px', border: `1px solid ${aiPrompt === p ? 'var(--accent)' : 'var(--border)'}`, background: aiPrompt === p ? 'rgba(64,93,230,0.1)' : 'transparent', color: aiPrompt === p ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>{p}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="AI'ya ne yaptırmak istiyorsun?" style={{ fontSize: '0.85rem' }} onKeyDown={e => e.key === 'Enter' && handleAI()} />
                    <button onClick={handleAI} disabled={aiLoading} style={{ padding: '0 0.9rem', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer', flexShrink: 0 }}>
                      {aiLoading ? '...' : <Send size={16} />}
                    </button>
                  </div>
                  {aiResponse && (
                    <div style={{ marginTop: '0.6rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.6rem' }}>{aiResponse}</p>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={insertAIText} style={{ padding: '0.35rem 0.75rem', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>✓ Ekle</button>
                        <button onClick={() => setAiResponse('')} style={{ padding: '0.35rem 0.75rem', background: 'var(--bg-soft)', border: 'none', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>✕ Reddet</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <textarea value={active.content} onChange={e => setActive({ ...active, content: e.target.value })} placeholder="Hikayeni buraya yaz..." style={{ flex: 1, background: 'var(--bg)', border: 'none', outline: 'none', padding: '1.5rem', fontFamily: 'var(--font-body)', fontSize: '1.05rem', lineHeight: 1.9, color: 'var(--text)', resize: 'none' }} />
              <div style={{ padding: '0.35rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Otomatik kaydetme: {writerFeatures.autoSaveIntervalSec} sn</p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">✍️</div>
              <p className="empty-state-title">Bölüm seç</p>
              <button onClick={() => setShowNewChapter(true)} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem' }}>+ Yeni Bölüm</button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
