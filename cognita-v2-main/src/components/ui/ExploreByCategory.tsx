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
    <div className="mt-3 bg-card border-t border-b border-border">
      <div className="flex justify-between items-center gap-1 p-[0.9rem_1rem]">
        <div className="flex items-center gap-1">
          <Grid2x2 size={15} className="text-accent" />
          <span className="text-sm font-bold text-text">Kategorilere Göre Keşfet</span>
        </div>
        <button
          onClick={() => router.push('/explore')}
          className="bg-transparent border-none text-xs text-accent font-semibold cursor-pointer hover:opacity-80 transition-opacity"
        >
          Tümü
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 p-[0_1rem_1rem]">
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className="flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[100px] hover:scale-95 hover:shadow-md"
            style={{
              background: category.color,
              border: `1px solid ${category.borderColor}`,
            }}
          >
            <div className="text-2xl mb-1">{category.icon}</div>
            <p className="text-xs font-bold text-text text-center leading-tight">
              {category.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
