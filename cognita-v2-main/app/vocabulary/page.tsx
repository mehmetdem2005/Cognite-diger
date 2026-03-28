'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import VocabularyCard from '@/components/ui/VocabularyCard'
import ReadingTimer from '@/components/ui/ReadingTimer'
import { useStore } from '@/store/useStore'

type Word = {
  id: string
  word: string
  meaning: string
  example?: string | null
  level?: 'temel' | 'orta' | 'ileri' | null
  is_learned?: boolean
}

export default function VocabularyPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [words, setWords] = useState<Word[]>([])
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [example, setExample] = useState('')
  const [level, setLevel] = useState<'temel' | 'orta' | 'ileri'>('orta')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const readingTimer = useStore((s) => s.readingTimer)
  const startTimer = useStore((s) => s.startTimer)
  const stopTimer = useStore((s) => s.stopTimer)
  const resetTimer = useStore((s) => s.resetTimer)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [loading, user])

  useEffect(() => {
    if (user) fetchWords()
  }, [user])

  const learnedCount = useMemo(() => words.filter((w) => w.is_learned).length, [words])

  async function authHeader() {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function fetchWords() {
    try {
      const headers = await authHeader()
      const res = await fetch('/api/vocabulary', { headers })
      const json = await res.json()
      if (res.ok) setWords(json.data || [])
    } catch {
      setMessage('Kelime listesi alınamadı')
    }
  }

  async function addWord() {
    if (!word.trim() || !meaning.trim()) return
    setSaving(true)
    setMessage('')
    try {
      const headers = await authHeader()
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ word: word.trim(), meaning: meaning.trim(), example: example.trim() || null, level }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Eklenemedi')
      setWords((prev) => [json.data, ...prev])
      setWord('')
      setMeaning('')
      setExample('')
      setMessage('Kelime eklendi')
    } catch (e: any) {
      setMessage(e?.message || 'Kelime eklenemedi')
    } finally {
      setSaving(false)
    }
  }

  async function markLearned(id: string, isLearned: boolean) {
    try {
      const headers = await authHeader()
      const res = await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ id, is_learned: !isLearned }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Güncellenemedi')
      setWords((prev) => prev.map((w) => (w.id === id ? json.data : w)))
    } catch {
      setMessage('Güncelleme başarısız')
    }
  }

  async function removeWord(id: string) {
    try {
      const headers = await authHeader()
      const query = new URLSearchParams({ id }).toString()
      const res = await fetch(`/api/vocabulary?${query}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Silinemedi')
      setWords((prev) => prev.filter((w) => w.id !== id))
    } catch {
      setMessage('Silme başarısız')
    }
  }

  async function exportNotes(format: 'markdown' | 'txt' | 'json') {
    try {
      const headers = await authHeader()
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ format }),
      })
      if (!res.ok) throw new Error('Dışa aktarma hatası')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'markdown' ? 'cognita-export.md' : format === 'txt' ? 'cognita-export.txt' : 'cognita-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setMessage('Dışa aktarma başarısız')
    }
  }

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1rem 1rem 6rem' }}>
      <h1 style={{ fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.4rem' }}>Kelime Defteri</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.9rem' }}>{learnedCount}/{words.length} öğrenildi</p>

      <ReadingTimer
        totalSeconds={readingTimer.totalSeconds}
        isRunning={readingTimer.isRunning}
        onStart={startTimer}
        onStop={stopTimer}
        onReset={resetTimer}
      />

      <div style={{ marginTop: '0.9rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.9rem', display: 'grid', gap: '0.55rem' }}>
        <input className="input" placeholder="Kelime" value={word} onChange={(e) => setWord(e.target.value)} />
        <input className="input" placeholder="Anlam" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
        <input className="input" placeholder="Örnek cümle (opsiyonel)" value={example} onChange={(e) => setExample(e.target.value)} />
        <select className="input" value={level} onChange={(e) => setLevel(e.target.value as any)}>
          <option value="temel">temel</option>
          <option value="orta">orta</option>
          <option value="ileri">ileri</option>
        </select>
        <button className="btn-primary" disabled={saving} onClick={addWord} style={{ width: 'fit-content' }}>
          {saving ? 'Ekleniyor...' : 'Kelime Ekle'}
        </button>
      </div>

      <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => exportNotes('markdown')} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '0.45rem 0.7rem' }}>Markdown Dışa Aktar</button>
        <button onClick={() => exportNotes('txt')} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '0.45rem 0.7rem' }}>TXT Dışa Aktar</button>
        <button onClick={() => exportNotes('json')} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '0.45rem 0.7rem' }}>JSON Dışa Aktar</button>
      </div>

      {message && <p style={{ marginTop: '0.7rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{message}</p>}

      <div style={{ marginTop: '0.95rem', display: 'grid', gap: '0.6rem' }}>
        {words.map((w) => (
          <VocabularyCard
            key={w.id}
            word={w.word}
            meaning={w.meaning}
            example={w.example}
            level={w.level}
            isLearned={!!w.is_learned}
            onLearned={() => markLearned(w.id, !!w.is_learned)}
            onReview={() => removeWord(w.id)}
          />
        ))}
      </div>
    </main>
  )
}
