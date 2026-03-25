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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Grid2x2 size={15} color="var(--accent)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Kategorilere Göre Keşfet</span>
        </div>
        <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
          Tümü
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', padding: '0 1rem 1rem' }}>
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 0.75rem',
              background: category.color,
              border: `1px solid ${category.borderColor}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '100px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{category.icon}</div>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>
              {category.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
