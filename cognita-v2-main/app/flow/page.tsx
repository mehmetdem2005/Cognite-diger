'use client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { Heart, MessageCircle, Share2, Bookmark, Music, Volume2, VolumeX } from 'lucide-react'
import BookCover from '@/components/ui/BookCover'
import { interaction } from '@/lib/interaction'
import { extractSmartQuotes, getMusicForGenre, inferGenreFromText } from '@/lib/smart-quote-extractor'

interface FlowItem {
  id: string
  book_id: string
  book_title: string
  book_author: string | null
  paragraph: string
  likes_count: number
  username: string | null
  gradient: string
  genre?: string // Müzik seçimi için
  quality_score?: number // AI kalitesi
}

interface HeartAnim {
  id: number
  index: number
  x: number
  y: number
}

const GRADIENTS = [
  'linear-gradient(160deg, #0F0C29, #302B63, #24243e)',
  'linear-gradient(160deg, #1A1A2E, #16213E, #0F3460)',
  'linear-gradient(160deg, #2D1B69, #11998e, #38ef7d)',
  'linear-gradient(160deg, #360033, #0b8793)',
  'linear-gradient(160deg, #1F1C2C, #928DAB)',
  'linear-gradient(160deg, #0F2027, #203A43, #2C5364)',
  'linear-gradient(160deg, #232526, #414345)',
  'linear-gradient(160deg, #16222A, #3A6073)',
  'linear-gradient(160deg, #141E30, #243B55)',
  'linear-gradient(160deg, #200122, #6f0000)',
  'linear-gradient(160deg, #0D0D0D, #1a1a2e, #16213e)',
  'linear-gradient(160deg, #1a0533, #3d0066, #1a0533)',
]

const SAMPLE_QUOTES = [
  { text: "Bazen bir şeyi anlamak için onu kaybetmek gerekir.", book: "Hayatın Sırları", author: "Cognita" },
  { text: "Her sabah uyandığında, hayatın bir gün daha kısa olduğunu unutma.", book: "Zaman Üzerine", author: "Cognita" },
  { text: "Kelimeler, söylenmediğinde daha güçlüdür.", book: "Sessizliğin Dili", author: "Cognita" },
  { text: "Gerçek yalnızlık, kalabalıkta hissedilir.", book: "Modern İnsan", author: "Cognita" },
  { text: "Bir kitap, bin arkadaşın söyleyemeyeceğini söyler.", book: "Cognita Manifestosu", author: "Cognita" },
  { text: "Anlamak istemeyene hiçbir şey anlatamazsın.", book: "İletişim Üzerine", author: "Cognita" },
  { text: "Okumak, başka bir insanın gözleriyle dünyayı görmektir.", book: "Okuma Üzerine", author: "Cognita" },
  { text: "Hafıza, yaşananları değil; hissedilenleri saklar.", book: "Anılar ve Duygular", author: "Cognita" },
  { text: "Büyük fikirler, sessiz zihinlerde doğar.", book: "Düşünce Üzerine", author: "Cognita" },
  { text: "Geçmiş değiştirilemez ama ona verdiğin anlam değişebilir.", book: "Psikoloji Notları", author: "Cognita" },
]

// Metni temizle ve kaliteli cümle seç
const BLOCKED_BOOKS = [
  "kavgam", "mein kampf", "adolf hitler", "hitler"
]

export default function FlowPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [items, setItems] = useState<FlowItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const [fetching, setFetching] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [heartAnims, setHeartAnims] = useState<HeartAnim[]>([])
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [currentGenre, setCurrentGenre] = useState<string>('general')
  const [trackCycle, setTrackCycle] = useState(0)
  const pageRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentMusicSeed = useMemo(() => {
    const currentItem = items[activeIndex]
    const base = `${currentGenre}:${currentItem?.id || activeIndex}:${trackCycle}`
    let hash = 0
    for (let i = 0; i < base.length; i += 1) {
      hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
  }, [currentGenre, items, activeIndex, trackCycle])
  const currentMusic = useMemo(
    () => getMusicForGenre(currentGenre, currentMusicSeed),
    [currentGenre, currentMusicSeed],
  )

  // Swipe refs
  const trackRef = useRef<HTMLDivElement>(null)
  const activeIndexRef = useRef(0)
  const isAnimating = useRef(false)
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const touchStartTime = useRef(0)
  const gestureLocked = useRef<'none' | 'vertical' | 'horizontal'>('none')
  const lastTapTime = useRef(0)
  const lastTapIndex = useRef(-1)
  const aiEnhancementJobs = useRef<Set<string>>(new Set())

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) fetchInitial() }, [user])
  useEffect(() => { activeIndexRef.current = activeIndex }, [activeIndex])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('cognita_flow_music_enabled')
    if (saved !== null) {
      setMusicEnabled(saved === 'true')
    }
  }, [])

  // Müzik genre'ine göre değiştir
  useEffect(() => {
    const currentItem = items[activeIndex]
    if (currentItem?.genre && currentItem.genre !== currentGenre) {
      setCurrentGenre(currentItem.genre)
      setTrackCycle(0)
    }
  }, [activeIndex, items, currentGenre])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('cognita_flow_music_enabled', String(musicEnabled))
  }, [musicEnabled])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = 0.24
    if (!musicEnabled) {
      audio.pause()
      return
    }

    audio.play().catch(() => {
      // Tarayıcı otomatik oynatmaya izin vermeyebilir
    })
  }, [musicEnabled, currentMusic.audioUrl])

  // Sonsuz scroll: sona 3 kart kala yükle
  useEffect(() => {
    if (activeIndex >= items.length - 3 && hasMore && !loadingMore && !fetching) {
      fetchMore()
    }
  }, [activeIndex])

  const fetchInitial = async () => {
    setFetching(true)
    pageRef.current = 0
    setActiveIndex(0)
    const newItems = await fetchPage(0)
    setItems(newItems)
    setFetching(false)
    loadUserInteractions()
  }

  const fetchMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    pageRef.current += 1
    const newItems = await fetchPage(pageRef.current)
    if (newItems.length < 3) setHasMore(false)
    setItems(prev => [...prev, ...newItems])
    setLoadingMore(false)
  }

  const fetchPage = async (page: number): Promise<FlowItem[]> => {
    const flowItems: FlowItem[] = []
    const offset = page * 5

    try {
      const [
        userBooksResponse,
        catalogBooksResponse,
        highlightsResponse,
      ] = await Promise.all([
        supabase
          .from('books')
          .select('id, title, author, content, profiles(username)')
          .eq('is_public', true)
          .not('content', 'is', null)
          .range(offset, offset + 4),
        supabase
          .from('catalog_books')
          .select('id, title, author, content')
          .eq('is_published', true)
          .not('content', 'is', null)
          .range(offset, offset + 2),
        supabase
          .from('highlights')
          .select('id, text, book_id, books(title, author, profiles(username))')
          .eq('is_public', true)
          .order('likes_count', { ascending: false })
          .range(offset, offset + 4),
      ])

      const userBooks = userBooksResponse.data
      const catalogBooks = catalogBooksResponse.data
      const highlights = highlightsResponse.data

      const enqueueAIEnhancement = (
        content: string,
        title: string,
        count: number,
        itemPrefix: string,
        jobKey: string,
      ) => {
        if (!content || aiEnhancementJobs.current.has(jobKey)) return

        aiEnhancementJobs.current.add(jobKey)

        extractSmartQuotes(content, title, count, true)
          .then((aiQuotes) => {
            if (!aiQuotes.length) return

            setItems(prev => prev.map((existingItem) => {
              if (!existingItem.id.startsWith(itemPrefix)) return existingItem

              const indexPart = Number(existingItem.id.split('-').pop() || '0')
              const aiQuote = aiQuotes[indexPart]
              if (!aiQuote || aiQuote.text === existingItem.paragraph) return existingItem

              return {
                ...existingItem,
                paragraph: aiQuote.text,
                genre: aiQuote.genre_hint || existingItem.genre,
                quality_score: aiQuote.quality_score,
              }
            }))
          })
          .catch(() => {
            // Sessiz fail: fallback kartlar zaten gösteriliyor
          })
          .finally(() => {
            aiEnhancementJobs.current.delete(jobKey)
          })
      }

      if (userBooks?.length) {
        const userBookItems = await Promise.all(userBooks.map(async (book) => {
          const titleLower = book.title.toLowerCase()
          const authorLower = (book.author || '').toLowerCase()
          if (BLOCKED_BOOKS.some(b => titleLower.includes(b) || authorLower.includes(b))) return [] as FlowItem[]
          
          const content = book.content || ''
          const title = book.title || 'Bilinmeyen'

          // Hızlı açılış: önce fallback
          const smartQuotes = await extractSmartQuotes(content, title, 2, false)

          enqueueAIEnhancement(
            content,
            title,
            2,
            `book-${book.id}-${page}-`,
            `book:${book.id}:${page}`,
          )

          return smartQuotes.map((sq, i) => ({
              id: `book-${book.id}-${page}-${i}`,
              book_id: book.id,
              book_title: book.title,
              book_author: book.author || null,
              paragraph: sq.text,
              likes_count: Math.floor(Math.random() * 300) + 20,
              username: (book as any).profiles?.username || null,
              gradient: GRADIENTS[i % GRADIENTS.length],
              genre: sq.genre_hint,
              quality_score: sq.quality_score,
            }))
        }))

        flowItems.push(...userBookItems.flat())
      }

      if (catalogBooks?.length) {
        const catalogItems = await Promise.all(catalogBooks.map(async (book) => {
          const content = book.content || ''
          const title = book.title || 'Bilinmeyen'
          const smartQuotes = await extractSmartQuotes(content, title, 1, false)

          enqueueAIEnhancement(
            content,
            title,
            1,
            `catalog-${book.id}-${page}-`,
            `catalog:${book.id}:${page}`,
          )

          return smartQuotes.map((sq, i) => ({
              id: `catalog-${book.id}-${page}-${i}`,
              book_id: book.id,
              book_title: book.title,
              book_author: book.author || null,
              paragraph: sq.text,
              likes_count: Math.floor(Math.random() * 300) + 20,
              username: null,
              gradient: GRADIENTS[i % GRADIENTS.length],
              genre: sq.genre_hint,
              quality_score: sq.quality_score,
            }))
        }))

        flowItems.push(...catalogItems.flat())
      }

      if (highlights?.length) {
        highlights.forEach((h: any, i: number) => {
          const text = h.text || ''
          // Kalite filtresi
          const wordCount = text.split(' ').length
          const dashCount = (text.match(/-/g) || []).length
          if (text.length > 60 && wordCount >= 6 && dashCount < 4) {
            const b = h.books
            flowItems.push({
              id: `hl-${h.id}-${page}`,
              book_id: h.book_id,
              book_title: b?.title || 'Bilinmeyen',
              book_author: b?.author || null,
              paragraph: text,
              likes_count: Math.floor(Math.random() * 200) + 10,
              username: b?.profiles?.username || null,
              gradient: GRADIENTS[(flowItems.length + i) % GRADIENTS.length],
              genre: inferGenreFromText(text),
              quality_score: 7.2,
            })
          }
        })
      }

      // 4. Sample quotes - her zaman birkaç tane karıştır
      ;[...SAMPLE_QUOTES].sort(() => Math.random() - 0.5).slice(0, 3).forEach((q, i) => {
        flowItems.push({
          id: `sample-${page}-${i}-${Date.now()}`,
          book_id: '',
          book_title: q.book,
          book_author: q.author,
          paragraph: q.text,
          likes_count: Math.floor(Math.random() * 500) + 10,
          username: 'cognita',
          gradient: GRADIENTS[(flowItems.length + i) % GRADIENTS.length],
          genre: inferGenreFromText(q.text),
          quality_score: 7,
        })
      })

      const unique = new Map<string, FlowItem>()
      flowItems.forEach((item) => {
        const key = item.paragraph
          .toLowerCase()
          .replace(/[“”"'‘’]/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        const existing = unique.get(key)
        if (!existing || (item.quality_score || 0) > (existing.quality_score || 0)) {
          unique.set(key, item)
        }
      })

      return Array.from(unique.values()).sort(() => Math.random() - 0.5)
    } catch (error) {
      console.error("Flow fetch error:", error)
      return flowItems
    }
  }



  const loadUserInteractions = async () => {
    if (!user) return
    const { data } = await supabase
      .from('likes')
      .select('target_id, target_type')
      .eq('user_id', user.id)
      .in('target_type', ['flow', 'flow_bookmark'])

    if (!data) return

    const nextLiked = new Set<string>()
    const nextBookmarked = new Set<string>()

    data.forEach((row) => {
      if (row.target_type === 'flow') nextLiked.add(row.target_id)
      if (row.target_type === 'flow_bookmark') nextBookmarked.add(row.target_id)
    })

    setLiked(nextLiked)
    setBookmarked(nextBookmarked)
  }

  // ── Swipe mekanizması ──
  const vh = () => window.innerHeight

  const setTrackY = useCallback((y: number, animated: boolean) => {
    if (!trackRef.current) return
    trackRef.current.style.transition = animated
      ? 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none'
    trackRef.current.style.transform = `translateY(${y}px)`
  }, [])

  const snapTo = useCallback((index: number) => {
    if (isAnimating.current) return
    isAnimating.current = true
    setTrackY(-index * vh(), true)
    setTimeout(() => {
      setActiveIndex(index)
      isAnimating.current = false
    }, 420)
  }, [setTrackY])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating.current) return
    if (e.cancelable) e.preventDefault()
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    gestureLocked.current = 'none'
    if (trackRef.current) trackRef.current.style.transition = 'none'
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAnimating.current) return
    if (e.cancelable) e.preventDefault()
    const deltaX = e.touches[0].clientX - touchStartX.current
    const delta = e.touches[0].clientY - touchStartY.current

    if (gestureLocked.current === 'none') {
      gestureLocked.current = Math.abs(delta) >= Math.abs(deltaX) ? 'vertical' : 'horizontal'
    }

    if (gestureLocked.current === 'horizontal') {
      const idx = activeIndexRef.current
      setTrackY(-idx * vh(), false)
      return
    }

    const idx = activeIndexRef.current
    const atStart = idx === 0 && delta > 0
    const atEnd = idx === items.length - 1 && delta < 0
    const rubber = atStart || atEnd ? 0.12 : 1
    setTrackY((-idx * vh()) + (delta * rubber), false)
  }, [items.length, setTrackY])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isAnimating.current) return

    if (gestureLocked.current === 'horizontal') {
      snapTo(activeIndexRef.current)
      gestureLocked.current = 'none'
      return
    }

    const delta = e.changedTouches[0].clientY - touchStartY.current
    const elapsed = Date.now() - touchStartTime.current
    const velocity = Math.abs(delta) / elapsed
    const idx = activeIndexRef.current
    const isFlick = velocity > 0.28
    const isFar = Math.abs(delta) > vh() * 0.22

    if ((isFlick || isFar) && delta < 0 && idx < items.length - 1) snapTo(idx + 1)
    else if ((isFlick || isFar) && delta > 0 && idx > 0) snapTo(idx - 1)
    else snapTo(idx)

    gestureLocked.current = 'none'
  }, [items.length, snapTo])

  // Çift tıklama = beğen + kalp animasyonu
  const onTap = useCallback((e: React.MouseEvent, item: FlowItem, index: number) => {
    const now = Date.now()
    const isDouble = now - lastTapTime.current < 300 && lastTapIndex.current === index
    lastTapTime.current = now
    lastTapIndex.current = index
    if (isDouble) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const animId = Date.now()
      setHeartAnims(prev => [...prev, { id: animId, index, x: e.clientX - rect.left, y: e.clientY - rect.top }])
      setTimeout(() => setHeartAnims(prev => prev.filter(a => a.id !== animId)), 900)
      if (!liked.has(item.id)) toggleLike(item.id)
    }
  }, [liked])

  const toggleLike = useCallback(async (id: string) => {
    if (!user) return
    interaction.like()
    const isLiked = liked.has(id)
    setLiked(prev => { const n = new Set(prev); isLiked ? n.delete(id) : n.add(id); return n })
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('target_id', id).eq('target_type', 'flow')
    } else {
      await supabase.from('likes').insert({ user_id: user.id, target_id: id, target_type: 'flow' })
    }
  }, [user, liked])

  const toggleBookmark = useCallback(async (id: string) => {
    if (!user) return
    interaction.bookmark()
    const isBm = bookmarked.has(id)
    setBookmarked(prev => { const n = new Set(prev); isBm ? n.delete(id) : n.add(id); return n })
    if (isBm) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('target_id', id).eq('target_type', 'flow_bookmark')
    } else {
      await supabase.from('likes').insert({ user_id: user.id, target_id: id, target_type: 'flow_bookmark' })
    }
  }, [user, bookmarked])

  if (loading || !user) return <main style={{ height: '100vh', background: '#000' }} />

  if (fetching) return (
    <main style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
        <p style={{ fontSize: '1rem', opacity: 0.5 }}>Akış hazırlanıyor...</p>
      </div>
    </main>
  )

  if (!items.length) return null

  return (
    <main
      style={{
        position: 'fixed', inset: 0,
        background: '#000',
        overflow: 'hidden',
        overscrollBehaviorX: 'none',
        overscrollBehaviorY: 'none',
        maxWidth: '100%',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}>
    
      {/* Müzik player kontrolü */}
      <div style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0.5rem)',
        right: '1rem',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 999,
        padding: '0.5rem 1rem',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
        <Music size={16} color="rgba(255,255,255,0.6)" />
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
          {currentMusic.name}
        </span>
        <button
          onClick={() => setMusicEnabled(prev => !prev)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {musicEnabled ? (
            <Volume2 size={16} color="rgba(255,255,255,0.8)" />
          ) : (
            <VolumeX size={16} color="rgba(255,255,255,0.5)" />
          )}
        </button>
      </div>

      {/*  Audio player element */}
      <audio 
        ref={audioRef} 
        autoPlay
        preload="none"
        src={currentMusic.audioUrl}
        onEnded={() => setTrackCycle(prev => prev + 1)}
        style={{ display: 'none' }}
      />

      {/* Track container */}
      <div ref={trackRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, willChange: 'transform' }}>
        {items.map((item, index) => (
          <div
            key={item.id}
            onClick={(e) => onTap(e, item, index)}
            style={{
              position: 'relative',
              width: '100%',
              height: '100dvh',
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Arka plan */}
            <div style={{ position: 'absolute', inset: 0, background: item.gradient }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
            <div style={{ position: 'absolute', top: '10%', left: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '15%', right: '-5%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'rgba(255,255,255,0.025)', filter: 'blur(70px)', pointerEvents: 'none' }} />

            {/* Çift tıklama kalp animasyonu */}
            {heartAnims.filter(anim => anim.index === index).map(anim => (
              <div key={anim.id} style={{ position: 'absolute', left: anim.x - 40, top: anim.y - 40, zIndex: 100, pointerEvents: 'none', animation: 'heartPop 0.9s ease forwards' }}>
                <Heart size={80} fill="#ff4d6d" color="#ff4d6d" />
              </div>
            ))}


            {/* Üst bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.25rem',
              paddingTop: 'max(2.5rem, env(safe-area-inset-top, 2.5rem))',
            }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'white', fontWeight: 400, opacity: 0.9 }}>
                ✨ The Flow
              </h1>
              <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 999, padding: '0.3rem 0.85rem', border: '1px solid rgba(255,255,255,0.18)' }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600 }}>
                  {activeIndex + 1} / {items.length}
                </span>
              </div>
            </div>

            {/* İçerik — tam ortada */}
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              paddingTop: '6rem',
              paddingBottom: '6rem',
              left: '1.5rem',
              right: '4.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              zIndex: 10,
            }}>
              <div style={{ fontSize: '4.5rem', color: 'rgba(255,255,255,0.1)', fontFamily: 'Georgia, serif', lineHeight: 0.7, marginBottom: '1rem' }}>"</div>

              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(1rem, 4.2vw, 1.3rem)',
                lineHeight: 1.75,
                color: 'rgba(255,255,255,0.95)',
                fontStyle: 'italic',
                letterSpacing: '0.01em',
                textShadow: '0 1px 20px rgba(0,0,0,0.5)',
                marginBottom: '1.75rem',
              }}>
                {item.paragraph}
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {item.genre && (
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.82)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '0.2rem 0.55rem' }}>
                    {item.genre}
                  </span>
                )}
                {typeof item.quality_score === 'number' && (
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.82)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '0.2rem 0.55rem' }}>
                    AI kalite: {item.quality_score.toFixed(1)}
                  </span>
                )}
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.82)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '0.2rem 0.55rem' }}>
                  {currentMusic.vibe}
                </span>
              </div>

              {/* Kitap kartı */}
              <div
                onClick={(e) => { e.stopPropagation(); item.book_id && router.push(`/book/${item.book_id}`) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 14, padding: '0.8rem 0.9rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: item.book_id ? 'pointer' : 'default',
                }}
              >
                <BookCover title={item.book_title} width={40} height={54} borderRadius={6} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.book_title}
                  </p>
                  {item.book_author && (
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.book_author}
                    </p>
                  )}
                  {item.username && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginTop: '0.1rem' }}>
                      @{item.username}
                    </p>
                  )}
                </div>
                {item.book_id && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '0.35rem 0.75rem', color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, border: '1px solid rgba(255,255,255,0.18)', whiteSpace: 'nowrap' }}>
                    Oku →
                  </div>
                )}
              </div>
            </div>

            {/* Sağ aksiyonlar */}
            <div style={{
              position: 'absolute', right: '0.75rem',
              top: 0, bottom: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '1.25rem', zIndex: 10,
              paddingBottom: '4rem',
            }}>
              {[
                {
                  icon: <Heart size={26} fill={liked.has(item.id) ? '#ff4d6d' : 'none'} color={liked.has(item.id) ? '#ff4d6d' : 'white'} strokeWidth={1.8} />,
                  label: (item.likes_count + (liked.has(item.id) ? 1 : 0)).toLocaleString(),
                  onClick: (e: React.MouseEvent) => { e.stopPropagation(); toggleLike(item.id) },
                },
                {
                  icon: <MessageCircle size={26} color="white" strokeWidth={1.8} />,
                  label: 'Yorum',
                  onClick: (e: React.MouseEvent) => { e.stopPropagation(); item.book_id && router.push(`/book/${item.book_id}`) },
                },
                {
                  icon: <Bookmark size={26} fill={bookmarked.has(item.id) ? 'white' : 'none'} color="white" strokeWidth={1.8} />,
                  label: bookmarked.has(item.id) ? '✓' : 'Kaydet',
                  onClick: (e: React.MouseEvent) => { e.stopPropagation(); toggleBookmark(item.id) },
                },
                {
                  icon: <Share2 size={24} color="white" strokeWidth={1.8} />,
                  label: 'Paylaş',
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (navigator.share) navigator.share({ title: item.book_title, text: `"${item.paragraph}" — ${item.book_title}` })
                  },
                },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
                    {btn.icon}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.62rem', fontWeight: 600 }}>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Sol progress */}
            <div style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Array.from({ length: Math.min(items.length, 9) }).map((_, i) => {
                const start = Math.max(0, Math.min(activeIndex - 4, items.length - 9))
                const realIdx = start + i
                const isCurrent = realIdx === activeIndex
                return <div key={i} style={{ width: isCurrent ? 4 : 3, height: isCurrent ? 28 : 7, borderRadius: 3, background: isCurrent ? 'white' : 'rgba(255,255,255,0.22)', transition: 'all 0.3s ease' }} />
              })}
            </div>
            

            {/* Sonsuz scroll yükleniyor */}
            {index === items.length - 1 && loadingMore && (
              <div style={{ position: 'absolute', bottom: '5.5rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: 999, padding: '0.4rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>Yükleniyor...</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(0.3); opacity: 1; }
          50%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <BottomNav />
    </main>
  )
}
