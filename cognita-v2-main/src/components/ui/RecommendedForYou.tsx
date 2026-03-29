'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BookCover from './BookCover'
import { Sparkles, ChevronRight } from 'lucide-react'

interface Recommendation {
  id: string
  book_id: string
  book: any
  reason?: string
  score?: number
}

interface Props {
  userId: string
}

export default function RecommendedForYou({ userId }: Props) {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch(`/api/recommendations?userId=${userId}`)
        const data = await res.json()
        setRecommendations(data.recommendations || [])
      } catch (error) {
        console.error('Failed to fetch recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchRecommendations()
  }, [userId])

  if (loading || recommendations.length === 0) return null

  return (
    <section className="card animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} color="var(--accent-warning)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Senin İçin Önerilen</h3>
        </div>
        <button onClick={() => router.push('/explore')} className="btn-ghost">
          Tümü
        </button>
      </div>

      <div className="hide-scrollbar flex gap-3 overflow-x-auto pt-2">
        {recommendations.map((rec, i) => (
          <div
            key={rec.id}
            onClick={() => router.push(`/book/${rec.book_id}`)}
            className="flex-shrink-0 w-24 cursor-pointer transition-transform hover:scale-105"
          >
            <div className="relative">
              <BookCover
                title={rec.book?.title}
                coverUrl={rec.book?.cover_url}
                width={100}
                height={140}
                borderRadius={10}
                index={i}
                style={{ marginBottom: '0.4rem', boxShadow: 'var(--shadow-md)' }}
              />
              {rec.reason && (
                <div
                  className="absolute top-1 right-1 bg-amber-500/90 text-white text-xs font-bold px-1.5 py-0.5 rounded backdrop-blur-sm"
                >
                  ⭐ %{Math.round((rec.score || 0.5) * 100)}
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-text-primary truncate mt-1">
              {rec.book?.title}
            </p>
            {rec.book?.author && (
              <p className="text-xs text-text-muted truncate">
                {rec.book.author}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
