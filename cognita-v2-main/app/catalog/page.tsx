'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { ArrowLeft, BookOpen, Search, Plus, Check } from 'lucide-react'
import { BOOK_CATEGORIES } from '@/lib/categories'
import { interaction } from '@/lib/interaction'

const GRADIENTS = [
  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
  'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
  'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
  'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
  'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
]

interface CatalogBook {
  id: string; title: string; author: string | null; cover_url: string | null
  description: string | null; categories: string[]; language: string; level: string | null
  total_pages: number
}

export default function CatalogPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [books, setBooks] = useState<CatalogBook[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) { fetchBooks(); fetchAdded() } }, [user])

  const fetchBooks = async () => {
    const res = await fetch('/api/catalog')
    const json = await res.json()
    setBooks(json.data || [])
  }

  const fetchAdded = async () => {
    const { data } = await supabase
      .from('user_catalog_books')
      .select('catalog_book_id')
      .eq('user_id', user!.id)
    if (data) setAddedIds(new Set(data.map(d => d.catalog_book_id)))
  }

  const handleAdd = async (book: CatalogBook) => {
    if (!user || addedIds.has(book.id)) return
    setAdding(book.id)
    // Kullanıcının kütüphanesine kitap ekle
    const words = 0
    const { data: inserted } = await supabase.from('books').insert({
      user_id: user.id,
      title: book.title,
      author: book.author,
      cover_url: book.cover_url,
      file_type: 'catalog',
      total_pages: book.total_pages,
      is_public: false,
      tags: book.categories,
    }).select().single()

    if (inserted) {
      // Katalog içeriğini kopyala
      const { data: catalogData } = await supabase
        .from('catalog_books')
        .select('content')
        .eq('id', book.id)
        .single()
      if (catalogData?.content) {
        localStorage.setItem(`book_content_${inserted.id}`, catalogData.content)
      }
      // user_catalog_books kaydı ekle
      await supabase.from('user_catalog_books').insert({
        user_id: user.id,
        catalog_book_id: book.id,
      })
      setAddedIds(prev => new Set(Array.from(prev).concat(book.id)))
      interaction.success()
    }
    setAdding(null)
  }

  const filtered = books.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'all' || (b.categories || []).includes(selectedCategory)
    const matchLang = selectedLanguage === 'all' || b.language === selectedLanguage
    return matchSearch && matchCat && matchLang
  })

  const languages = [
    { id: 'all', label: 'Tümü' },
    { id: 'tr', label: 'Türkçe' },
    { id: 'en', label: 'İngilizce' },
    { id: 'ru', label: 'Rusça' },
    { id: 'de', label: 'Almanca' },
    { id: 'fr', label: 'Fransızca' },
    { id: 'es', label: 'İspanyolca' },
  ]

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: '54px', display: 'flex', alignItems: 'center', gap: '0.75rem', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--text)" />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', flex: 1 }}>Katalog</h1>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{filtered.length} kitap</span>
      </header>

      <div style={{ padding: '1rem' }}>
        {/* Arama */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Kitap veya yazar ara..." style={{ paddingLeft: '2.2rem' }} />
        </div>

        {/* Dil filtresi */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.75rem', paddingBottom: '0.25rem' }}>
          {languages.map(l => (
            <button key={l.id} onClick={() => setSelectedLanguage(l.id)} style={{ flexShrink: 0, padding: '0.3rem 0.8rem', borderRadius: '999px', border: `1.5px solid ${selectedLanguage === l.id ? 'var(--accent)' : 'var(--border)'}`, background: selectedLanguage === l.id ? 'rgba(64,93,230,0.1)' : 'transparent', color: selectedLanguage === l.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: selectedLanguage === l.id ? 700 : 400, cursor: 'pointer' }}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Kategori filtresi */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '1rem', paddingBottom: '0.25rem' }}>
          {BOOK_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setSelectedCategory(c.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', borderRadius: '999px', border: `1.5px solid ${selectedCategory === c.id ? 'var(--accent)' : 'var(--border)'}`, background: selectedCategory === c.id ? 'rgba(64,93,230,0.1)' : 'transparent', color: selectedCategory === c.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: selectedCategory === c.id ? 700 : 400, cursor: 'pointer' }}>
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>

        {/* Kitap grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <BookOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Henüz katalogda kitap yok.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {filtered.map((book, i) => {
              const isAdded = addedIds.has(book.id)
              const isAdding = adding === book.id
              return (
                <div key={book.id} style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ height: '160px', background: book.cover_url ? 'transparent' : GRADIENTS[i % GRADIENTS.length], position: 'relative', overflow: 'hidden' }}>
                    {book.cover_url ? (
                      <img src={book.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: GRADIENTS[i % GRADIENTS.length], display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
                        <BookOpen size={28} color="rgba(255,255,255,0.8)" />
                        <p style={{ fontSize: '0.72rem', color: 'white', fontWeight: 700, textAlign: 'center', marginTop: '0.5rem', lineHeight: 1.3 }}>{book.title}</p>
                      </div>
                    )}
                    {book.level && (
                      <span style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '999px', background: 'rgba(0,0,0,0.5)', color: 'white', fontWeight: 700 }}>{book.level}</span>
                    )}
                  </div>
                  <div style={{ padding: '0.7rem' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                    {book.author && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>}
                    <button onClick={() => handleAdd(book)} disabled={isAdded || isAdding} style={{ width: '100%', padding: '0.45rem', borderRadius: '10px', border: 'none', background: isAdded ? 'rgba(67,233,123,0.15)' : 'var(--accent)', color: isAdded ? '#16a34a' : 'white', fontSize: '0.78rem', fontWeight: 700, cursor: isAdded ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', opacity: isAdding ? 0.6 : 1 }}>
                      {isAdded ? <><Check size={13} /> Eklendi</> : isAdding ? 'Ekleniyor...' : <><Plus size={13} /> Kütüphaneye Ekle</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
