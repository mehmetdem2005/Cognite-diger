'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Grid2x2, ChevronRight } from 'lucide-react'

const CATEGORIES = [
  { id: 'sci-fi', label: 'Bilim Kurgu', icon: '🚀', color: 'rgba(64,93,230,0.1)', borderColor: 'rgba(64,93,230,0.2)' },
  { id: 'romance', label: 'Romantizm', icon: '💕', color: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.2)' },
  { id: 'mystery', label: 'Gizem', icon: '🔍', color: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' },
  { id: 'fantasy', label: 'Fantezi', icon: '🧙', color: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.2)' },
  { id: 'history', label: 'Tarih', icon: '📜', color: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' },
  { id: 'self-help', label: 'Kişisel Gelişim', icon: '📈', color: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' },
  { id: 'thriller', label: 'Gerilim', icon: '⚡', color: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  { id: 'poetry', label: 'Şiir', icon: '✨', color: 'rgba(236,72,153,0.1)', borderColor: 'rgba(236,72,153,0.2)' },
]

interface Props {
  userId?: string
}

export default function ExploreByCategory({ userId }: Props) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/explore?category=${categoryId}`)
  }

  return (
    <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Grid2x2 size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Kategorilere Göre Keşfet</span>
        </div>
        <button
          onClick={() => router.push('/explore')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '0.8rem',
            color: 'var(--accent)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 200ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Tümü
        </button>
      </div>

      <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '1rem', paddingBottom: '1.2rem' }}>
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 0.8rem',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              minHeight: '110px',
              minWidth: '90px',
              flexShrink: 0,
              background: category.color,
              border: `1px solid ${category.borderColor}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{category.icon}</div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>
              {category.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
