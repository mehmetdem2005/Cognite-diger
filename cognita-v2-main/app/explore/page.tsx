'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { Search, Grid, List, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { BOOK_CATEGORIES } from '@/lib/categories'
import BookCover from '@/components/ui/BookCover'

interface Book {
  id: string; title: string; author: string | null
  description: string | null; created_at: string; tags: string[]
  cover_url?: string | null
  profiles: { username: string | null; full_name: string | null } | null
  isCatalog?: boolean
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

export default function ExplorePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [search, setSearch] = useState('')
  const [fetching, setFetching] = useState(true)
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid')
  const [category, setCategory] = useState('all')
  const [showCategories, setShowCategories] = useState(false)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { fetchBooks() }, [])

  const fetchBooks = async () => {
    const [{ data: userBooks }, catalogRes] = await Promise.all([
      supabase.from('books').select('*, profiles(username, full_name)')
        .eq('is_public', true).order('created_at', { ascending: false }).limit(60),
      fetch('/api/catalog').then(r => r.json()),
    ])
    const catalog: Book[] = (catalogRes.data || []).map((b: any) => ({
      id: b.id, title: b.title, author: b.author, description: b.description,
      created_at: b.created_at, tags: b.categories || [],
      cover_url: b.cover_url, profiles: null, isCatalog: true,
    }))
    setBooks([...(userBooks || []), ...catalog].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setFetching(false)
  }

  const activeCategory = BOOK_CATEGORIES.find(c => c.id === category)

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q)
    const matchCategory = category === 'all' || (b.tags || []).includes(category)
    return matchSearch && matchCategory
  })

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px', overflowX: 'hidden' }}>
      <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100, overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem 0.5rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>Keşfet</h1>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button onClick={() => setShowCategories(!showCategories)} style={{ background: showCategories ? 'var(--bg-soft)' : 'transparent', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <SlidersHorizontal size={18} />
            </button>
            <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'var(--bg-soft)' : 'transparent', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: viewMode === 'grid' ? 'var(--text)' : 'var(--text-muted)' }}>
              <Grid size={18} />
            </button>
            <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--bg-soft)' : 'transparent', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: viewMode === 'list' ? 'var(--text)' : 'var(--text-muted)' }}>
              <List size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '0 1rem 0.5rem', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '1.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Kitap, yazar, konu ara..." style={{ paddingLeft: '2.25rem' }} />
        </div>

        {/* Hızlı kategori scroll */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.4rem', padding: '0 1rem 0.75rem', overflowX: 'auto' }}>
          {BOOK_CATEGORIES.slice(0, 10).map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{ flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: '999px', border: 'none', background: category === c.id ? 'var(--text)' : 'var(--bg-soft)', color: category === c.id ? 'var(--bg)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: category === c.id ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tüm kategoriler */}
      {showCategories && (
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Tüm Kategoriler</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {BOOK_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => { setCategory(c.id); setShowCategories(false) }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '10px', border: `1.5px solid ${category === c.id ? 'var(--accent)' : 'var(--border)'}`, background: category === c.id ? 'rgba(64,93,230,0.1)' : 'var(--bg-soft)', color: category === c.id ? 'var(--accent)' : 'var(--text)', fontSize: '0.78rem', fontWeight: category === c.id ? 700 : 400, cursor: 'pointer', minWidth: 0 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{c.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aktif kategori başlığı */}
      {category !== 'all' && (
        <div style={{ padding: '0.75rem 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>{activeCategory?.icon}</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{activeCategory?.label}</span>
          <button onClick={() => setCategory('all')} style={{ marginLeft: 'auto', background: 'var(--bg-soft)', border: 'none', borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕ Temizle</button>
        </div>
      )}

      <div style={{ padding: '0.75rem 1rem' }}>
        {fetching ? (
          <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: viewMode === 'grid' ? '200px' : '80px', borderRadius: '12px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{activeCategory?.icon || '🔍'}</div>
            <p className="empty-state-title">Henüz kitap yok</p>
            <p className="empty-state-desc">{category !== 'all' ? `${activeCategory?.label} kategorisinde` : 'Bu aramada'} sonuç bulunamadı</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {filtered.map((book, i) => (
              <div key={book.id} onClick={() => router.push(book.isCatalog ? `/catalog/${book.id}` : `/book/${book.id}`)} style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)' }}>
                <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
                  <BookCover title={book.title} coverUrl={book.cover_url} width={300} height={450} borderRadius={0} index={i} style={{ width: '100%', height: '100%', boxShadow: 'none' }} />
                  <div style={{ position: 'absolute', bottom: '0.4rem', right: '0.4rem', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.62rem', color: 'white' }}>
                    {book.isCatalog ? '📚 Katalog' : `@${book.profiles?.username || 'anonim'}`}
                  </div>
                </div>
                <div style={{ padding: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', lineHeight: 1.3, marginBottom: '0.2rem', color: 'var(--text)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</p>
                  {book.author && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{book.author}</p>}
                  {book.tags?.length > 0 && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {book.tags.slice(0, 2).map(tag => {
                        const cat = BOOK_CATEGORIES.find(c => c.id === tag)
                        return cat ? <span key={tag} className="tag" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>{cat.icon} {cat.label}</span> : null
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((book, i) => (
              <div key={book.id} onClick={() => router.push(book.isCatalog ? `/catalog/${book.id}` : `/book/${book.id}`)} style={{ background: 'var(--bg-card)', borderRadius: '12px', display: 'flex', gap: '0.75rem', padding: '0.9rem', cursor: 'pointer', border: '1px solid var(--border)', alignItems: 'center' }}>
                <BookCover title={book.title} coverUrl={book.cover_url} width={48} height={64} borderRadius={8} index={i} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.15rem' }}>{book.title}</p>
                  {book.author && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{book.author}</p>}
                  <p style={{ fontSize: '0.7rem', color: book.isCatalog ? 'var(--text-muted)' : 'var(--accent)', fontWeight: 500 }}>{book.isCatalog ? '📚 Katalog' : `@${book.profiles?.username || 'anonim'}`}</p>
                </div>
                <ChevronRight size={16} color="var(--border)" />
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
