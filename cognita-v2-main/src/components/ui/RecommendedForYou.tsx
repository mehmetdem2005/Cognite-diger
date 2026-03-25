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
    <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={15} color="#f59e0b" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Senin İçin Önerilen</span>
        </div>
        <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
          Tümü
        </button>
      </div>

      <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.9rem', overflowX: 'auto', padding: '0 1rem 1rem' }}>
        {recommendations.map((rec, i) => (
          <div
            key={rec.id}
            onClick={() => router.push(`/book/${rec.book_id}`)}
            style={{ flexShrink: 0, width: '100px', cursor: 'pointer' }}
          >
            <div style={{ position: 'relative' }}>
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
                  style={{
                    position: 'absolute',
                    top: '0.4rem',
                    right: '0.4rem',
                    background: 'rgba(245,158,11,0.9)',
                    color: 'white',
                    fontSize: '0.6rem',
                    padding: '0.2rem 0.4rem',
                    borderRadius: 4,
                    fontWeight: 700,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  ⭐ %{Math.round((rec.score || 0.5) * 100)}
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rec.book?.title}
            </p>
            {rec.book?.author && (
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rec.book.author}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
