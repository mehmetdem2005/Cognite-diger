'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import QuizModal from '@/components/ui/QuizModal'
import {
  ArrowLeft, Settings, Zap, Bookmark, BookOpen, X,
  Search, List, Sun, Moon, Type, AlignJustify,
  ChevronLeft, ChevronRight, Volume2, Copy, Share2,
  Highlighter, MessageSquare, Sparkles, MoreHorizontal,
  Anchor, ChevronUp, ChevronDown
} from 'lucide-react'

interface Book { id: string; title: string; author: string | null; total_pages: number; cover_url?: string | null }
interface Flashcard { question: string; answer: string }
interface WordPanel { word: string; x: number; y: number; translation?: string; ipa?: string; meanings?: string[]; examples?: string[]; loading: boolean }
interface SelectionToolbar { text: string; x: number; y: number }
interface Highlight { id: string; text: string; page: number; color: string; note?: string }
interface SearchResult { page: number; context: string; index: number }
interface ExerciseItem { id: string; question: string; options?: string[]; answer_key?: { correct?: string } }
interface GuideState { prediction: string; main_idea: string; character_notes: string }
interface ExerciseAttempt { exercise_id: string; is_correct: boolean | null; score: number | null; attempted_at: string }

const WORDS_PER_PAGE = 300

const THEMES = {
  light:  { bg: '#FAFAF8', text: '#1A1612', nav: 'rgba(255,255,255,0.95)', border: 'rgba(0,0,0,0.06)', accent: '#405DE6', sub: '#999', card: '#F0EFE9' },
  sepia:  { bg: '#F4ECD8', text: '#2D2118', nav: 'rgba(237,224,196,0.95)', border: 'rgba(80,50,20,0.1)', accent: '#8B5E1A', sub: '#8B7355', card: '#EAD9BE' },
  dark:   { bg: '#1C1C1E', text: '#E5E5EA', nav: 'rgba(28,28,30,0.95)', border: 'rgba(255,255,255,0.08)', accent: '#667EEA', sub: '#6e6e73', card: '#2C2C2E' },
  black:  { bg: '#000000', text: '#EBEBF5', nav: 'rgba(0,0,0,0.95)', border: 'rgba(255,255,255,0.06)', accent: '#667EEA', sub: '#636366', card: '#1C1C1E' },
}

const HIGHLIGHT_COLORS = ['#FFE066', '#86EFAC', '#93C5FD', '#F9A8D4', '#FCA5A5']

export default function ReaderPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const contentRef = useRef<HTMLDivElement>(null)

  // Kitap
  const [book, setBook] = useState<Book | null>(null)
  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [fullText, setFullText] = useState('')

  // Okuyucu ayarları
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.85)
  const [theme, setTheme] = useState<keyof typeof THEMES>('light')
  const [fontFamily, setFontFamily] = useState<'sans'|'serif'|'mono'>('serif')
  const [justify, setJustify] = useState(true)

  // UI panelleri
  const [showMenu, setShowMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [barsVisible, setBarsVisible] = useState(true)
  const barsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Kelime paneli
  const [wordPanel, setWordPanel] = useState<WordPanel | null>(null)
  const [readerFeatures, setReaderFeatures] = useState({
    longPressEnabled: true,
    translationEnabled: true,
    ttsEnabled: true,
    wordExamplesEnabled: true,
  })

  // Metin seçim toolbar
  const [selectionBar, setSelectionBar] = useState<SelectionToolbar | null>(null)
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0])

  // Arama
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchIndex, setSearchIndex] = useState(0)

  // Yer imleri & Highlights
  const [bookmarks, setBookmarks] = useState<number[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false)

  // Flashcard
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [loadingCards, setLoadingCards] = useState(false)

  // Linga-benzeri alıştırma ve rehber
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<Array<{ id: string; question: string; options: string[]; answer: string }>>([])
  const [sectionQuizStats, setSectionQuizStats] = useState({ attempts: 0, correct: 0, successRate: 0, avgScore: 0 })
  const [sectionQuizLoading, setSectionQuizLoading] = useState(false)
  const [showGuidePanel, setShowGuidePanel] = useState(false)
  const [guideLoading, setGuideLoading] = useState(false)
  const [guideSaving, setGuideSaving] = useState(false)
  const [guideFeedback, setGuideFeedback] = useState('')
  const [guide, setGuide] = useState<GuideState>({ prediction: '', main_idea: '', character_notes: '' })

  // İstatistikler
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [started, setStarted] = useState(false)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Touch/swipe
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggered = useRef(false)

  // İçindekiler
  const [toc, setToc] = useState<{ title: string; page: number }[]>([])

  const tc = THEMES[theme]
  const total = pages.length || 1
  const progress = Math.round((currentPage / total) * 100)
  const sectionKey = `page_${currentPage}`
  const fontStyle = fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif'
    : fontFamily === 'mono' ? '"Courier New", monospace'
    : 'var(--font-body)'

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user && id) { fetchBook(); loadLocal(); fetchReaderFeatures() } }, [user, id])
  useEffect(() => { setIsCurrentBookmarked(bookmarks.includes(currentPage)) }, [currentPage, bookmarks])
  useEffect(() => {
    if (book && user) {
      void loadSectionQuizStats()
    }
  }, [book, user, currentPage])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  // Bars otomatik gizle
  useEffect(() => {
    if (barsVisible) {
      clearTimeout(barsTimer.current)
      barsTimer.current = setTimeout(() => setBarsVisible(false), 4000)
    }
    return () => clearTimeout(barsTimer.current)
  }, [barsVisible, currentPage])

  // Session timer
  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => setSessionMinutes(p => p + 1), 60000)
    return () => clearInterval(timerRef.current)
  }, [started])

  // Metin seçim olayı
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) {
        setSelectionBar(null)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelectionBar({
        text: sel.toString().trim(),
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      })
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const loadLocal = () => {
    const savedBM = localStorage.getItem(`reader_bookmarks_${id}`)
    if (savedBM) setBookmarks(JSON.parse(savedBM))
    const savedHL = localStorage.getItem(`reader_highlights_${id}`)
    if (savedHL) setHighlights(JSON.parse(savedHL))
    const savedSettings = localStorage.getItem(`reader_settings`)
    if (savedSettings) {
      const s = JSON.parse(savedSettings)
      if (s.fontSize) setFontSize(s.fontSize)
      if (s.lineHeight) setLineHeight(s.lineHeight)
      if (s.theme) setTheme(s.theme)
      if (s.fontFamily) setFontFamily(s.fontFamily)
      if (s.justify !== undefined) setJustify(s.justify)
    }
  }

  const saveSettings = (updates: object) => {
    const current = JSON.parse(localStorage.getItem('reader_settings') || '{}')
    localStorage.setItem('reader_settings', JSON.stringify({ ...current, ...updates }))
  }

  const authHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchBook = async () => {
    const { data } = await supabase.from('books').select('*').eq('id', id).single()
    if (!data) return
    setBook(data)
    let text = localStorage.getItem(`book_content_${id}`)
    if (!text) {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (token) {
          const res = await fetch(`/api/books/${id}/content`, { headers: { Authorization: `Bearer ${token}` } })
          if (res.ok) { const json = await res.json(); text = json.content }
        }
      } catch {}
    }
    if (!text) {
      const { data: cat } = await supabase.from('catalog_books').select('content').eq('title', data.title).single()
      if (cat?.content) text = cat.content
    }
    if (text) {
      try { localStorage.setItem(`book_content_${id}`, text) } catch {}
      setFullText(text)
      buildPages(text)
      buildTOC(text)
    } else {
      setPages(['Bu kitap için içerik eklenmedi.'])
    }
    // Son sayfa
    const { data: sess } = await supabase.from('reading_sessions').select('current_page').eq('book_id', id).eq('user_id', user!.id).single()
    if (sess?.current_page) setCurrentPage(sess.current_page)
  }

  const fetchReaderFeatures = async () => {
    try {
      const keys = [
        'reader_long_press_panel_enabled',
        'reader_translation_enabled',
        'reader_tts_enabled',
        'reader_word_examples_enabled',
      ]
      const { data } = await supabase.from('app_settings').select('key, value').in('key', keys)
      const map = new Map((data || []).map(item => [item.key, item.value]))
      setReaderFeatures({
        longPressEnabled: map.get('reader_long_press_panel_enabled') !== '0',
        translationEnabled: map.get('reader_translation_enabled') !== '0',
        ttsEnabled: map.get('reader_tts_enabled') !== '0',
        wordExamplesEnabled: map.get('reader_word_examples_enabled') !== '0',
      })
    } catch {}
  }

  const buildPages = (text: string) => {
    const words = text.split(' ')
    const p: string[] = []
    for (let i = 0; i < words.length; i += WORDS_PER_PAGE) p.push(words.slice(i, i + WORDS_PER_PAGE).join(' '))
    setPages(p.length > 0 ? p : [text])
  }

  const buildTOC = (text: string) => {
    const lines = text.split('\n')
    const chapters: { title: string; page: number }[] = []
    let wordCount = 0
    lines.forEach(line => {
      const trimmed = line.trim()
      if (/^(chapter|bölüm|part|kısım|prologue|epilogue)\s/i.test(trimmed) && trimmed.length < 60) {
        chapters.push({ title: trimmed, page: Math.floor(wordCount / WORDS_PER_PAGE) + 1 })
      }
      wordCount += line.split(' ').length
    })
    setToc(chapters)
  }

  const saveSession = useCallback(async () => {
    if (!user || !book) return
    const prog = Math.round((currentPage / total) * 100)
    await supabase.from('reading_sessions').upsert({
      user_id: user.id, book_id: book.id, current_page: currentPage,
      progress_percent: prog, session_duration_seconds: sessionMinutes * 60,
      wpm_measured: wpm || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,book_id' })
  }, [user, book, currentPage, total, sessionMinutes, wpm])

  const changePage = useCallback((dir: 'next' | 'prev') => {
    if (!started) { setStarted(true); startRef.current = Date.now() }
    const pw = pages[currentPage - 1]?.split(' ').length || WORDS_PER_PAGE
    const newTotal = wordCount + pw
    setWordCount(newTotal)
    const totalMin = (Date.now() - startRef.current) / 60000
    if (totalMin > 0.1) setWpm(Math.round(newTotal / totalMin))
    setWordPanel(null)
    setSelectionBar(null)
    if (dir === 'next' && currentPage < total) { setCurrentPage(p => p + 1); saveSession() }
    else if (dir === 'prev' && currentPage > 1) { setCurrentPage(p => p - 1); saveSession() }
    setBarsVisible(true)
  }, [started, wordCount, pages, currentPage, total, saveSession])

  // Touch/swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 60 && dy < 50) {
      if (dx < 0) changePage('next')
      else changePage('prev')
    }
  }

  const startWordLookup = useCallback(async (word: string, rect: DOMRect) => {
    setBarsVisible(true)
    setWordPanel({ word, x: rect.left, y: rect.bottom, loading: true, translation: undefined, ipa: undefined, meanings: undefined, examples: undefined })

    if (!readerFeatures.translationEnabled) {
      setWordPanel(prev => prev ? { ...prev, loading: false, translation: 'Çeviri özelliği admin tarafından kapatıldı.' } : null)
      return
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `"${word}" kelimesini analiz et. Sadece JSON döndür, başka hiçbir şey yazma:
{"translation":"Türkçe anlamı","ipa":"IPA fonetik","meanings":["anlam1","anlam2","anlam3"],"examples":["örnek cümle 1","örnek cümle 2"]}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content || data.message || ''
      const json = JSON.parse(text.replace(/```json|```/g, '').trim())
      const safeExamples = Array.isArray(json.examples) ? json.examples.slice(0, 2) : []
      setWordPanel(prev => prev ? { ...prev, loading: false, ...json, examples: safeExamples } : null)
    } catch {
      setWordPanel(prev => prev ? { ...prev, loading: false, translation: 'Çeviri alınamadı' } : null)
    }
  }, [readerFeatures.translationEnabled])

  const handleWordTap = useCallback((e: React.MouseEvent) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }

    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return // metin seçiliyse kelime paneli açma

    setBarsVisible(v => !v)
  }, [])

  const handleContentPressStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (!readerFeatures.longPressEnabled) return
    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    const target = event.target as HTMLElement
    const word = target?.textContent?.match(/\b[a-zA-ZğüşöçıİĞÜŞÖÇ]{3,}\b/)?.[0]
    if (!word) return

    const rect = target.getBoundingClientRect()
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      startWordLookup(word, rect)
    }, 360)
  }

  const handleContentPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Highlight kaydet
  const saveHighlight = (color: string) => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (!text) return
    const newHL: Highlight = { id: Date.now().toString(), text, page: currentPage, color }
    const updated = [...highlights, newHL]
    setHighlights(updated)
    localStorage.setItem(`reader_highlights_${id}`, JSON.stringify(updated))
    sel.removeAllRanges()
    setSelectionBar(null)
  }

  // Flow'a gönder
  const sendToFlow = async () => {
    if (!selectionBar || !user) return
    await supabase.from('highlights').insert({
      user_id: user.id, book_id: id, text: selectionBar.text,
      page_number: currentPage, is_public: true, color: 'amber',
    })
    setSelectionBar(null)
    window.getSelection()?.removeAllRanges()
    alert('Flow\'a gönderildi! ✨')
  }
  // Yer imi
  const toggleBookmark = () => {
    const updated = isCurrentBookmarked
      ? bookmarks.filter(b => b !== currentPage)
      : [...bookmarks, currentPage].sort((a, b) => a - b)
    setBookmarks(updated)
    localStorage.setItem(`reader_bookmarks_${id}`, JSON.stringify(updated))
    setIsCurrentBookmarked(!isCurrentBookmarked)
  }

  // Arama
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    if (!q.trim() || !fullText) { setSearchResults([]); return }
    const results: SearchResult[] = []
    const words = fullText.split(' ')
    const pageSize = WORDS_PER_PAGE
    let pageIdx = 0
    for (let i = 0; i < words.length; i++) {
      if (i % pageSize === 0) pageIdx++
      if (words[i].toLowerCase().includes(q.toLowerCase())) {
        const context = words.slice(Math.max(0, i - 5), i + 6).join(' ')
        results.push({ page: pageIdx, context, index: i })
      }
    }
    setSearchResults(results.slice(0, 50))
    setSearchIndex(0)
    if (results.length > 0) setCurrentPage(results[0].page)
  }, [fullText])

  // Flashcard
  const generateFlashcards = async () => {
    if (!book) return
    setLoadingCards(true); setShowFlashcards(true); setShowMenu(false)
    try {
      const text = pages.slice(Math.max(0, currentPage - 2), currentPage + 1).join(' ')
      const res = await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, bookTitle: book.title }),
      })
      const data = await res.json()
      setFlashcards(data.cards || [{ question: 'Hata', answer: data.error || 'Üretilemedi' }])
      setCardIndex(0); setCardFlipped(false)
    } catch (e: any) {
      setFlashcards([{ question: 'Hata', answer: e.message }])
    }
    setLoadingCards(false)
  }

  const loadSectionQuiz = async () => {
    if (!book) return
    setQuizLoading(true)
    try {
      const headers = await authHeaders()
      const query = new URLSearchParams({ book_id: String(book.id), section_key: sectionKey }).toString()
      const res = await fetch(`/api/reader/exercises?${query}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Quiz alinamadi')

      const exercises: ExerciseItem[] = Array.isArray(json.exercises) ? json.exercises : []
      const mapped = exercises
        .filter((e) => Array.isArray(e.options) && typeof e.answer_key?.correct === 'string')
        .slice(0, 8)
        .map((e) => ({
          id: e.id,
          question: e.question,
          options: e.options as string[],
          answer: String(e.answer_key?.correct || ''),
        }))

      if (mapped.length === 0) {
        alert('Bu bolum icin henuz quiz yok.')
        return
      }

      setQuizQuestions(mapped)
      setShowQuizModal(true)
    } catch (e: any) {
      alert(e?.message || 'Quiz acilamadi')
    } finally {
      setQuizLoading(false)
    }
  }

  const loadSectionQuizStats = async () => {
    if (!book) return
    setSectionQuizLoading(true)
    try {
      const headers = await authHeaders()
      const query = new URLSearchParams({ book_id: String(book.id), section_key: sectionKey }).toString()
      const res = await fetch(`/api/reader/exercises?${query}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Istatistik alinamadi')

      const attempts: ExerciseAttempt[] = Array.isArray(json.attempts) ? json.attempts : []
      const totalAttempts = attempts.length
      const correct = attempts.filter((a) => a.is_correct === true).length
      const scored = attempts.filter((a) => typeof a.score === 'number')
      const avgScore = scored.length > 0
        ? Math.round(scored.reduce((sum, a) => sum + Number(a.score || 0), 0) / scored.length)
        : 0
      const successRate = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0

      setSectionQuizStats({
        attempts: totalAttempts,
        correct,
        successRate,
        avgScore,
      })
    } catch {
      setSectionQuizStats({ attempts: 0, correct: 0, successRate: 0, avgScore: 0 })
    } finally {
      setSectionQuizLoading(false)
    }
  }

  const submitQuizAttempt = async (exerciseId: string, selected: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      }
      await fetch('/api/reader/exercises', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'attempt', exercise_id: exerciseId, user_answer: { correct: selected } }),
      })
      await loadSectionQuizStats()
    } catch {
      // Quiz deneyimi kesilmesin diye sessizce gec
    }
  }

  const loadGuide = async () => {
    if (!book) return
    setGuideLoading(true)
    setGuideFeedback('')
    try {
      const headers = await authHeaders()
      const query = new URLSearchParams({ book_id: String(book.id), section_key: sectionKey }).toString()
      const res = await fetch(`/api/reader/guides?${query}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Rehber alinamadi')

      const data = json.data
      setGuide({
        prediction: data?.prediction || '',
        main_idea: data?.main_idea || '',
        character_notes: data?.character_notes ? JSON.stringify(data.character_notes, null, 2) : '',
      })
      setShowGuidePanel(true)
    } catch (e: any) {
      alert(e?.message || 'Rehber acilamadi')
    } finally {
      setGuideLoading(false)
    }
  }

  const saveGuide = async () => {
    if (!book) return
    setGuideSaving(true)
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      }
      let characterNotes: any = null
      if (guide.character_notes.trim()) {
        try {
          characterNotes = JSON.parse(guide.character_notes)
        } catch {
          characterNotes = { notes: guide.character_notes }
        }
      }

      const res = await fetch('/api/reader/guides', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          book_id: book.id,
          section_key: sectionKey,
          prediction: guide.prediction,
          main_idea: guide.main_idea,
          character_notes: characterNotes,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Rehber kaydedilemedi')
      alert('Rehber notlari kaydedildi')
    } catch (e: any) {
      alert(e?.message || 'Kaydetme basarisiz')
    } finally {
      setGuideSaving(false)
    }
  }

  const requestGuideFeedback = async () => {
    setGuideSaving(true)
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      }
      const payload = {
        prediction: guide.prediction,
        main_idea: guide.main_idea,
        character_notes: guide.character_notes,
      }
      const res = await fetch('/api/reader/guides', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'feedback', content: payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Geri bildirim alinamadi')
      setGuideFeedback(json.feedback || '')
    } catch (e: any) {
      alert(e?.message || 'Geri bildirim alinamadi')
    } finally {
      setGuideSaving(false)
    }
  }

  // TTS
  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word)
      u.lang = 'en-US'
      window.speechSynthesis.speak(u)
    }
  }

  const highlightText = (text: string) => {
    if (!searchQuery) return text
    const regex = new RegExp(`(${searchQuery})`, 'gi')
    return text.replace(regex, '<mark style="background:#FFE066;border-radius:3px;padding:0 2px">$1</mark>')
  }

  if (loading || !user) return <main style={{ minHeight: '100vh', background: '#FAFAF8' }} />
  if (!book) return (
    <main style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
      <BookOpen size={48} color="#ccc" />
      <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Kitap bulunamadı</p>
      <button onClick={() => router.push('/library')} style={{ padding: '0.6rem 1.5rem', background: '#405DE6', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Geri Dön</button>
    </main>
  )

  const pageText = pages[currentPage - 1] || 'Yükleniyor...'

  return (
    <main
      style={{ minHeight: '100vh', background: tc.bg, color: tc.text, transition: 'background 0.3s, color 0.3s', userSelect: 'text' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Üst Bar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1rem', height: '52px',
        background: tc.nav, borderBottom: `1px solid ${tc.border}`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        transform: barsVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease',
      }}>
        <button onClick={() => { saveSession(); router.push('/library') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub, padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={18} color={tc.text} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', padding: '0 0.5rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: tc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
          <p style={{ fontSize: '0.6rem', color: tc.sub }}>%{progress} · {Math.round((total - currentPage) * 1.5)} dk kaldı</p>
        </div>
        <div style={{ display: 'flex', gap: '0.1rem', alignItems: 'center' }}>
          <button onClick={() => { setShowSearch(!showSearch); setBarsVisible(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: tc.sub }}>
            <Search size={18} color={showSearch ? tc.accent : tc.text} />
          </button>
          <button onClick={() => { setShowTOC(true); setBarsVisible(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            <List size={18} color={tc.text} />
          </button>
          <button onClick={toggleBookmark} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            <Bookmark size={18} color={isCurrentBookmarked ? tc.accent : tc.text} fill={isCurrentBookmarked ? tc.accent : 'none'} />
          </button>
          <button onClick={() => { setShowMenu(!showMenu); setBarsVisible(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            <MoreHorizontal size={18} color={tc.text} />
          </button>
        </div>
      </nav>

      {/* ── İlerleme Çubuğu ── */}
      <div style={{ position: 'fixed', top: barsVisible ? '52px' : '0', left: 0, right: 0, height: '2px', background: tc.border, zIndex: 99, transition: 'top 0.3s' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: tc.accent, transition: 'width 0.4s ease' }} />
      </div>

      {/* ── Arama Çubuğu ── */}
      {showSearch && (
        <div style={{ position: 'fixed', top: '52px', left: 0, right: 0, zIndex: 101, background: tc.nav, borderBottom: `1px solid ${tc.border}`, padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Search size={16} color={tc.sub} />
          <input
            autoFocus
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Kitapta ara..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.9rem', color: tc.text, fontFamily: fontStyle }}
          />
          {searchResults.length > 0 && (
            <>
              <span style={{ fontSize: '0.72rem', color: tc.sub, whiteSpace: 'nowrap' }}>{searchIndex + 1}/{searchResults.length}</span>
              <button onClick={() => { const ni = (searchIndex - 1 + searchResults.length) % searchResults.length; setSearchIndex(ni); setCurrentPage(searchResults[ni].page) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}><ChevronUp size={16} color={tc.text} /></button>
              <button onClick={() => { const ni = (searchIndex + 1) % searchResults.length; setSearchIndex(ni); setCurrentPage(searchResults[ni].page) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}><ChevronDown size={16} color={tc.text} /></button>
            </>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub, fontWeight: 600, fontSize: '0.85rem' }}>İptal</button>
        </div>
      )}

      {/* ── Metin İçeriği ── */}
      <div
        ref={contentRef}
        onClick={handleWordTap}
        onMouseDown={handleContentPressStart}
        onMouseUp={handleContentPressEnd}
        onMouseLeave={handleContentPressEnd}
        onTouchStart={handleContentPressStart}
        onTouchEnd={handleContentPressEnd}
        style={{
          maxWidth: '680px', margin: '0 auto',
          padding: `${barsVisible ? '5.5rem' : '2rem'} 1.5rem ${barsVisible ? '8rem' : '4rem'}`,
          transition: 'padding 0.3s',
        }}
      >
        {/* Sayfa metni */}
        {searchQuery ? (
          <p
            style={{ fontFamily: fontStyle, fontSize: `${fontSize}px`, lineHeight, color: tc.text, textAlign: justify ? 'justify' : 'left', whiteSpace: 'pre-wrap', letterSpacing: '0.01em' }}
            dangerouslySetInnerHTML={{ __html: highlightText(pageText) }}
          />
        ) : (
          <p style={{ fontFamily: fontStyle, fontSize: `${fontSize}px`, lineHeight, color: tc.text, textAlign: justify ? 'justify' : 'left', whiteSpace: 'pre-wrap', letterSpacing: '0.01em' }}>
            {pageText}
          </p>
        )}

        {/* Bu sayfanın highlight'ları */}
        {highlights.filter(h => h.page === currentPage).length > 0 && (
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${tc.border}` }}>
            <p style={{ fontSize: '0.72rem', color: tc.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Bu Sayfanın Notları</p>
            {highlights.filter(h => h.page === currentPage).map(h => (
              <div key={h.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: 3, minHeight: 40, background: h.color, borderRadius: 2, flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', color: tc.text, lineHeight: 1.6, fontStyle: 'italic' }}>"{h.text}"</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1rem', padding: '0.8rem', border: `1px solid ${tc.border}`, borderRadius: 12, background: tc.card }}>
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: tc.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Bolum Quiz Istatistigi · {sectionKey}
          </p>
          {sectionQuizLoading ? (
            <p style={{ margin: '0.45rem 0 0', color: tc.sub, fontSize: '0.82rem' }}>Yukleniyor...</p>
          ) : sectionQuizStats.attempts === 0 ? (
            <p style={{ margin: '0.45rem 0 0', color: tc.sub, fontSize: '0.82rem' }}>Bu bolum icin henuz quiz denemesi yok.</p>
          ) : (
            <div style={{ marginTop: '0.45rem', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '0.4rem' }}>
              <div style={{ padding: '0.45rem', borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}` }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: tc.sub }}>Deneme</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.92rem', fontWeight: 700, color: tc.text }}>{sectionQuizStats.attempts}</p>
              </div>
              <div style={{ padding: '0.45rem', borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}` }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: tc.sub }}>Dogru</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.92rem', fontWeight: 700, color: tc.text }}>{sectionQuizStats.correct}</p>
              </div>
              <div style={{ padding: '0.45rem', borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}` }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: tc.sub }}>Basari</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.92rem', fontWeight: 700, color: tc.accent }}>%{sectionQuizStats.successRate}</p>
              </div>
              <div style={{ padding: '0.45rem', borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}` }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: tc.sub }}>Skor</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.92rem', fontWeight: 700, color: tc.text }}>{sectionQuizStats.avgScore}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Kelime Paneli ── */}
      {wordPanel && (
        <div style={{
          position: 'fixed', bottom: barsVisible ? '72px' : '0', left: 0, right: 0, zIndex: 300,
          background: tc.nav, borderTop: `1px solid ${tc.border}`,
          borderRadius: '20px 20px 0 0',
          padding: '1.25rem 1.25rem 2rem',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          transition: 'bottom 0.3s',
          animation: 'slideUp 0.25s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: tc.text, fontFamily: 'Georgia, serif' }}>{wordPanel.word}</h3>
                {readerFeatures.ttsEnabled && (
                  <button onClick={() => speakWord(wordPanel.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                    <Volume2 size={16} color={tc.accent} />
                  </button>
                )}
              </div>
              {wordPanel.ipa && <p style={{ fontSize: '0.85rem', color: tc.sub, fontFamily: 'Georgia, serif' }}>{wordPanel.ipa}</p>}
            </div>
            <button onClick={() => setWordPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub }}><X size={20} /></button>
          </div>

          {wordPanel.loading ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '1rem 0' }}>
              <div style={{ width: 20, height: 20, border: `2px solid ${tc.border}`, borderTop: `2px solid ${tc.accent}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ color: tc.sub, fontSize: '0.85rem' }}>Çevriliyor...</span>
            </div>
          ) : (
            <>
              {wordPanel.translation && (
                <p style={{ fontSize: '1rem', color: tc.accent, fontWeight: 600, marginBottom: '0.5rem' }}>{wordPanel.translation}</p>
              )}
              {wordPanel.meanings && wordPanel.meanings.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {wordPanel.meanings.map((m, i) => (
                    <span key={i} style={{ background: tc.card, color: tc.sub, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.8rem' }}>{m}</span>
                  ))}
                </div>
              )}
              {readerFeatures.wordExamplesEnabled && wordPanel.examples && wordPanel.examples.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.72rem', color: tc.sub, fontWeight: 700, marginBottom: '0.35rem' }}>Örnek cümleler</p>
                  {wordPanel.examples.map((example, index) => (
                    <p key={index} style={{ fontSize: '0.82rem', color: tc.text, marginBottom: '0.2rem', lineHeight: 1.45 }}>• {example}</p>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  saveHighlight(HIGHLIGHT_COLORS[0])
                  setWordPanel(null)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: `1px solid ${tc.border}`, borderRadius: 12, padding: '0.45rem 0.85rem', cursor: 'pointer', color: tc.sub, fontSize: '0.8rem' }}
              >
                <Highlighter size={14} /> Kelime Listeme Ekle
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Metin Seçim Toolbar ── */}
      {selectionBar && (
        <div style={{
          position: 'fixed',
          top: Math.max(10, selectionBar.y - 54),
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 400,
          background: '#1C1C1E',
          borderRadius: 14,
          padding: '0.4rem 0.5rem',
          display: 'flex', gap: '0.1rem', alignItems: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          animation: 'fadeInUp 0.15s ease',
        }}>
          {HIGHLIGHT_COLORS.map(color => (
            <button key={color} onClick={() => saveHighlight(color)} style={{ width: 22, height: 22, borderRadius: '50%', background: color, border: 'none', cursor: 'pointer', flexShrink: 0 }} />
          ))}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)', margin: '0 0.2rem' }} />
          <button onClick={sendToFlow} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'white', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
            <Sparkles size={13} /> Flow
          </button>
          <button onClick={() => { navigator.clipboard.writeText(selectionBar.text); setSelectionBar(null); window.getSelection()?.removeAllRanges() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'white' }}>
            <Copy size={14} />
          </button>
          {navigator.share && (
            <button onClick={() => { navigator.share({ text: selectionBar.text }); setSelectionBar(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'white' }}>
              <Share2 size={14} />
            </button>
          )}
          <button onClick={() => setSelectionBar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'rgba(255,255,255,0.5)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Alt Bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: tc.nav, borderTop: `1px solid ${tc.border}`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        transform: barsVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Slider */}
        <div style={{ padding: '0.5rem 1rem 0' }}>
          <input type="range" min={1} max={total} value={currentPage}
            onChange={e => { setCurrentPage(Number(e.target.value)); setBarsVisible(true) }}
            style={{ width: '100%', accentColor: tc.accent, height: '3px', cursor: 'pointer' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.75rem 0.6rem', gap: '0.25rem' }}>
          {/* Önceki */}
          <button onClick={() => changePage('prev')} disabled={currentPage <= 1}
            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.45rem 0.85rem', background: 'none', border: `1px solid ${tc.border}`, color: currentPage <= 1 ? tc.sub : tc.text, borderRadius: 10, fontSize: '0.8rem', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: currentPage <= 1 ? 0.4 : 1 }}>
            <ChevronLeft size={15} /> Önceki
          </button>

          {/* Orta ikonlar */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => { setShowSettings(true); setBarsVisible(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: tc.sub }}>
              <Type size={17} color={tc.text} />
            </button>
            <button onClick={() => { setShowBookmarks(true); setBarsVisible(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: tc.sub }}>
              <Bookmark size={17} color={tc.text} />
            </button>
            <div style={{ textAlign: 'center', minWidth: 50 }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: tc.accent }}>{currentPage}/{total}</p>
              {wpm > 0 && <p style={{ fontSize: '0.58rem', color: tc.sub }}>{wpm} k/dk</p>}
            </div>
            <button onClick={() => { setShowHighlights(true); setBarsVisible(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem' }}>
              <Highlighter size={17} color={tc.text} />
            </button>
            <button onClick={loadGuide} disabled={guideLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', opacity: guideLoading ? 0.6 : 1 }}>
              <MessageSquare size={17} color={tc.text} />
            </button>
            <button onClick={generateFlashcards} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem' }}>
              <Zap size={17} color={tc.text} />
            </button>
          </div>

          {/* Sonraki */}
          <button onClick={() => changePage('next')} disabled={currentPage >= total}
            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.45rem 0.85rem', background: currentPage >= total ? 'none' : tc.accent, border: `1px solid ${currentPage >= total ? tc.border : tc.accent}`, color: currentPage >= total ? tc.sub : '#fff', borderRadius: 10, fontSize: '0.8rem', cursor: currentPage >= total ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: currentPage >= total ? 0.4 : 1 }}>
            Sonraki <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Menü (3 nokta) ── */}
      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setShowMenu(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: '52px', right: '0.75rem',
            background: tc.nav, border: `1px solid ${tc.border}`,
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            minWidth: 180,
          }}>
            {[
              { icon: <BookOpen size={16} />, label: 'İçindekiler', action: () => { setShowTOC(true); setShowMenu(false) } },
              { icon: <Bookmark size={16} />, label: 'Yer İmleri', action: () => { setShowBookmarks(true); setShowMenu(false) } },
              { icon: <Highlighter size={16} />, label: 'Notlarım', action: () => { setShowHighlights(true); setShowMenu(false) } },
              { icon: <MessageSquare size={16} />, label: 'Okuma Rehberi', action: () => { void loadGuide(); setShowMenu(false) } },
              { icon: <Anchor size={16} />, label: quizLoading ? 'Quiz yukleniyor...' : 'Bolum Quizi', action: () => { void loadSectionQuiz(); setShowMenu(false) } },
              { icon: <Zap size={16} />, label: 'Flashcard Üret', action: generateFlashcards },
              { icon: <Settings size={16} />, label: 'Okuyucu Ayarları', action: () => { setShowSettings(true); setShowMenu(false) } },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'none', border: 'none', borderBottom: i < 6 ? `1px solid ${tc.border}` : 'none', cursor: 'pointer', color: tc.text, fontSize: '0.88rem', textAlign: 'left' }}>
                <span style={{ color: tc.sub }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Okuma Rehberi ── */}
      {showGuidePanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 520, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowGuidePanel(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: tc.nav, borderRadius: '20px 20px 0 0', padding: '1.25rem', maxHeight: '78vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: tc.text }}>Okuma Rehberi · {sectionKey}</h3>
              <button onClick={() => setShowGuidePanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gap: '0.65rem' }}>
              <textarea
                value={guide.prediction}
                onChange={(e) => setGuide((g) => ({ ...g, prediction: e.target.value }))}
                placeholder="Tahminim (sonraki bolumde ne olacak?)"
                rows={3}
                style={{ width: '100%', background: tc.card, border: `1px solid ${tc.border}`, borderRadius: 10, color: tc.text, padding: '0.65rem', resize: 'vertical' }}
              />
              <textarea
                value={guide.main_idea}
                onChange={(e) => setGuide((g) => ({ ...g, main_idea: e.target.value }))}
                placeholder="Ana fikir"
                rows={3}
                style={{ width: '100%', background: tc.card, border: `1px solid ${tc.border}`, borderRadius: 10, color: tc.text, padding: '0.65rem', resize: 'vertical' }}
              />
              <textarea
                value={guide.character_notes}
                onChange={(e) => setGuide((g) => ({ ...g, character_notes: e.target.value }))}
                placeholder="Karakter notlari (JSON veya duz metin)"
                rows={4}
                style={{ width: '100%', background: tc.card, border: `1px solid ${tc.border}`, borderRadius: 10, color: tc.text, padding: '0.65rem', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={saveGuide} disabled={guideSaving} style={{ border: 'none', borderRadius: 10, padding: '0.55rem 0.85rem', background: tc.accent, color: '#fff', cursor: 'pointer', opacity: guideSaving ? 0.6 : 1 }}>Kaydet</button>
              <button onClick={requestGuideFeedback} disabled={guideSaving} style={{ border: `1px solid ${tc.border}`, borderRadius: 10, padding: '0.55rem 0.85rem', background: 'transparent', color: tc.text, cursor: 'pointer', opacity: guideSaving ? 0.6 : 1 }}>AI Geri Bildirim</button>
            </div>

            {guideFeedback && (
              <div style={{ marginTop: '0.8rem', background: tc.card, border: `1px solid ${tc.border}`, borderRadius: 10, padding: '0.7rem' }}>
                <p style={{ fontSize: '0.75rem', color: tc.sub, marginBottom: '0.3rem', fontWeight: 700 }}>AI Notu</p>
                <p style={{ fontSize: '0.85rem', color: tc.text, lineHeight: 1.5 }}>{guideFeedback}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Okuyucu Ayarları ── */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: tc.nav, borderRadius: '20px 20px 0 0', padding: '1.5rem 1.25rem 2.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: tc.text }}>Okuyucu Ayarları</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub }}><X size={20} /></button>
            </div>

            {/* Tema */}
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: tc.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Tema</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {(['light','sepia','dark','black'] as const).map(t => (
                <button key={t} onClick={() => { setTheme(t); saveSettings({ theme: t }) }} style={{ padding: '0.6rem 0', borderRadius: 12, border: `2px solid ${theme === t ? tc.accent : tc.border}`, background: THEMES[t].bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: THEMES[t].accent }} />
                  <span style={{ fontSize: '0.65rem', color: THEMES[t].text, fontWeight: theme === t ? 700 : 400 }}>
                    {t === 'light' ? 'Açık' : t === 'sepia' ? 'Sepia' : t === 'dark' ? 'Koyu' : 'Siyah'}
                  </span>
                </button>
              ))}
            </div>

            {/* Font */}
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: tc.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Yazı Tipi</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {(['sans','serif','mono'] as const).map(f => (
                <button key={f} onClick={() => { setFontFamily(f); saveSettings({ fontFamily: f }) }} style={{ padding: '0.75rem 0', borderRadius: 12, border: `2px solid ${fontFamily === f ? tc.accent : tc.border}`, background: fontFamily === f ? `${tc.accent}15` : tc.card, cursor: 'pointer', fontSize: '0.8rem', fontFamily: f === 'serif' ? 'Georgia, serif' : f === 'mono' ? 'monospace' : 'sans-serif', color: tc.text, fontWeight: fontFamily === f ? 700 : 400 }}>
                  {f === 'sans' ? 'Modern' : f === 'serif' ? 'Klasik' : 'Mono'}
                </button>
              ))}
            </div>

            {/* Font boyutu */}
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: tc.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Font Boyutu: {fontSize}px</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => { const v = Math.max(14, fontSize - 1); setFontSize(v); saveSettings({ fontSize: v }) }} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${tc.border}`, background: tc.card, cursor: 'pointer', fontSize: '1.2rem', color: tc.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input type="range" min={14} max={26} value={fontSize} onChange={e => { const v = Number(e.target.value); setFontSize(v); saveSettings({ fontSize: v }) }} style={{ flex: 1, accentColor: tc.accent }} />
              <button onClick={() => { const v = Math.min(26, fontSize + 1); setFontSize(v); saveSettings({ fontSize: v }) }} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${tc.border}`, background: tc.card, cursor: 'pointer', fontSize: '1.2rem', color: tc.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            {/* Satır aralığı */}
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: tc.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Satır Aralığı: {lineHeight.toFixed(1)}</p>
            <input type="range" min={1.4} max={2.4} step={0.1} value={lineHeight} onChange={e => { const v = Number(e.target.value); setLineHeight(v); saveSettings({ lineHeight: v }) }} style={{ width: '100%', accentColor: tc.accent, marginBottom: '1.5rem' }} />

            {/* Hizalama */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: tc.text }}>İki Yana Hizala</p>
              <button onClick={() => { setJustify(v => !v); saveSettings({ justify: !justify }) }} style={{ width: 44, height: 26, borderRadius: 999, background: justify ? tc.accent : tc.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: justify ? 20 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </button>
            </div>

            {/* İstatistikler */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
              {[{ l: 'Süre', v: `${sessionMinutes}dk` }, { l: 'WPM', v: wpm || '—' }, { l: 'İlerleme', v: `%${progress}` }].map(s => (
                <div key={s.l} style={{ textAlign: 'center', padding: '0.6rem', background: tc.card, borderRadius: 12 }}>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: tc.accent }}>{s.v}</p>
                  <p style={{ fontSize: '0.6rem', color: tc.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── İçindekiler ── */}
      {showTOC && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowTOC(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: tc.nav, borderRadius: '20px 20px 0 0', padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: tc.text }}>İçindekiler</h3>
              <button onClick={() => setShowTOC(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub }}><X size={20} /></button>
            </div>
            {toc.length === 0 ? (
              <p style={{ color: tc.sub, textAlign: 'center', padding: '2rem 0', fontSize: '0.9rem' }}>Bölüm bulunamadı</p>
            ) : toc.map((ch, i) => (
              <button key={i} onClick={() => { setCurrentPage(ch.page); setShowTOC(false) }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', background: 'none', border: 'none', borderBottom: `1px solid ${tc.border}`, cursor: 'pointer', color: tc.text, textAlign: 'left' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: currentPage === ch.page ? 700 : 400, color: currentPage === ch.page ? tc.accent : tc.text }}>{ch.title}</span>
                <span style={{ fontSize: '0.75rem', color: tc.sub }}>S. {ch.page}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Yer İmleri ── */}
      {showBookmarks && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowBookmarks(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: tc.nav, borderRadius: '20px 20px 0 0', padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: tc.text }}>Yer İmleri ({bookmarks.length})</h3>
              <button onClick={() => setShowBookmarks(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub }}><X size={20} /></button>
            </div>
            {bookmarks.length === 0 ? (
              <p style={{ color: tc.sub, textAlign: 'center', padding: '2rem 0' }}>Henüz yer imi yok.<br />Okurken 🔖 ikonuna bas.</p>
            ) : bookmarks.map(pg => (
              <button key={pg} onClick={() => { setCurrentPage(pg); setShowBookmarks(false) }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0.5rem', background: currentPage === pg ? `${tc.accent}15` : 'none', border: 'none', borderBottom: `1px solid ${tc.border}`, borderRadius: 8, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bookmark size={15} color={tc.accent} fill={tc.accent} />
                  <span style={{ fontSize: '0.9rem', color: tc.text, fontWeight: currentPage === pg ? 700 : 400 }}>Sayfa {pg}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: tc.sub }}>%{Math.round(pg / total * 100)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Notlar / Highlights ── */}
      {showHighlights && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowHighlights(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: tc.nav, borderRadius: '20px 20px 0 0', padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: tc.text }}>Notlarım ({highlights.length})</h3>
              <button onClick={() => setShowHighlights(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub }}><X size={20} /></button>
            </div>
            {highlights.length === 0 ? (
              <p style={{ color: tc.sub, textAlign: 'center', padding: '2rem 0' }}>Henüz not yok.<br />Metin seç ve highlight ekle.</p>
            ) : highlights.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem 0', borderBottom: `1px solid ${tc.border}`, alignItems: 'flex-start' }}>
                <div style={{ width: 4, minHeight: 44, background: h.color, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.88rem', color: tc.text, lineHeight: 1.5, fontStyle: 'italic', marginBottom: '0.25rem' }}>"{h.text}"</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: tc.sub }}>Sayfa {h.page}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setCurrentPage(h.page); setShowHighlights(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: tc.accent }}>Sayfaya git</button>
                      <button onClick={() => { const u = highlights.filter(x => x.id !== h.id); setHighlights(u); localStorage.setItem(`reader_highlights_${id}`, JSON.stringify(u)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub }}><X size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Flashcard ── */}
      {showFlashcards && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ width: '100%', maxWidth: 400, background: tc.nav, borderRadius: 20, padding: '1.5rem', border: `1px solid ${tc.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: tc.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Flashcard {cardIndex + 1}/{flashcards.length}</p>
              <button onClick={() => setShowFlashcards(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.sub, fontSize: '1.2rem' }}>✕</button>
            </div>
            {loadingCards ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: tc.sub }}>AI üretiyor...</div>
            ) : flashcards.length > 0 ? (
              <>
                <div onClick={() => setCardFlipped(!cardFlipped)} style={{ minHeight: 150, background: tc.bg, borderRadius: 14, padding: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '1.25rem', border: `1px solid ${tc.border}` }}>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: tc.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>{cardFlipped ? 'CEVAP' : 'SORU · Dokunarak çevir'}</p>
                    <p style={{ fontFamily: fontStyle, fontSize: '1rem', lineHeight: 1.6, color: tc.text }}>{cardFlipped ? flashcards[cardIndex]?.answer : flashcards[cardIndex]?.question}</p>
                  </div>
    
            </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => { setCardIndex(p => Math.max(0, p - 1)); setCardFlipped(false) }} disabled={cardIndex === 0} style={{ flex: 1, padding: '0.65rem', background: 'none', border: `1px solid ${tc.border}`, color: tc.text, borderRadius: 10, cursor: 'pointer', fontWeight: 600, opacity: cardIndex === 0 ? 0.4 : 1 }}>← Önceki</button>
                  <button onClick={() => { setCardIndex(p => Math.min(flashcards.length - 1, p + 1)); setCardFlipped(false) }} disabled={cardIndex === flashcards.length - 1} style={{ flex: 1, padding: '0.65rem', background: tc.accent, border: 'none', color: '#fff', borderRadius: 10, cursor: 'pointer', fontWeight: 600, opacity: cardIndex === flashcards.length - 1 ? 0.4 : 1 }}>Sonraki →</button>
                </div>
              </>
            ) : <p style={{ textAlign: 'center', color: tc.sub }}>Üretilemedi.</p>}
          </div>
        </div>
      )}

      <QuizModal
        open={showQuizModal}
        questions={quizQuestions.map((q) => ({ question: q.question, options: q.options, answer: q.answer }))}
        onClose={() => setShowQuizModal(false)}
        onAnswer={({ selected, index }) => {
          const item = quizQuestions[index]
          if (item?.id) {
            void submitQuizAttempt(item.id, selected)
          }
        }}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes fadeInUp { from { transform: translateX(-50%) translateY(8px); opacity: 0 } to { transform: translateX(-50%) translateY(0); opacity: 1 } }
      `}</style>
    </main>
  )
}
