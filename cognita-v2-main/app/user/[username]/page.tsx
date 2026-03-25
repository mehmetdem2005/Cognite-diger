'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { ArrowLeft, UserPlus, UserMinus, BookOpen } from 'lucide-react'
import BookCover from '@/components/ui/BookCover'
import { interaction } from '@/lib/interaction'

interface Profile {
  id: string; full_name: string | null; username: string | null
  bio: string | null; avatar_url: string | null
  streak_days: number; total_pages_read: number; xp: number; level: number
}

interface Book {
  id: string; title: string; author: string | null; created_at: string; cover_url?: string | null
}

export default function UserProfilePage() {
  const { username } = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const isOwnProfile = user && profile && user.id === profile.id

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user && username) fetchProfile() }, [user, username])

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (!data) return
    setProfile(data)
    const { data: booksData } = await supabase.from('books').select('*').eq('user_id', data.id).eq('is_public', true).order('created_at', { ascending: false }).limit(6)
    setBooks(booksData || [])
    const { count: fc } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', data.id)
    setFollowerCount(fc || 0)
    const { count: fgc } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', data.id)
    setFollowingCount(fgc || 0)
    if (user) {
      const { data: followData } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', data.id).single()
      setIsFollowing(!!followData)
    }
  }

  const handleFollow = async () => {
    if (!user || !profile) return
    interaction.follow()
    setFollowLoading(true)
    const res = await fetch('/api/follow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: user.id, followingId: profile.id }),
    })
    const data = await res.json()
    setIsFollowing(data.following)
    setFollowerCount(prev => data.following ? prev + 1 : prev - 1)
    setFollowLoading(false)
  }

  const COLORS = ['#2D6A4F','#E8A430','#C77DFF','#4895EF','#E63946','#2EC4B6']

  if (loading || !user || !profile) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ padding: '1rem 1.5rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><ArrowLeft size={20} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>@{profile.username}</h1>
      </header>

      <div style={{ padding: '1.5rem' }}>
        {/* Profil kartı */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'white', fontWeight: 600 }}>
                {profile.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.15rem' }}>{profile.full_name}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{profile.username}</p>
              </div>
            </div>
            {!isOwnProfile && (
              <button onClick={handleFollow} disabled={followLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: isFollowing ? 'transparent' : 'var(--accent)', border: `1.5px solid ${isFollowing ? 'var(--border)' : 'var(--accent)'}`, borderRadius: '8px', color: isFollowing ? 'var(--text-muted)' : 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                {isFollowing ? <><UserMinus size={14} /> Takibi Bırak</> : <><UserPlus size={14} /> Takip Et</>}
              </button>
            )}
            {isOwnProfile && (
              <button onClick={() => router.push('/profile')} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>Profili Düzenle</button>
            )}
          </div>
          {profile.bio && <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: '1rem' }}>{profile.bio}</p>}
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { value: followerCount, label: 'Takipçi' },
              { value: followingCount, label: 'Takip' },
              { value: profile.streak_days, label: 'Seri 🔥' },
              { value: profile.total_pages_read, label: 'Sayfa' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--accent)' }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seviye */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Seviye {profile.level}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>{profile.xp} XP</span>
          </div>
          <div style={{ height: '5px', background: 'var(--bg-soft)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(profile.xp % 200) / 2}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Kitaplar */}
        {books.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BookOpen size={16} color="var(--accent)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500 }}>Kitapları</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {books.map((book, i) => (
                <div key={book.id} className="card" onClick={() => router.push(`/book/${book.id}`)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                  <BookCover title={book.title} coverUrl={book.cover_url} width={300} height={80} borderRadius={0} index={i} style={{ width: '100%', boxShadow: 'none' }} />
                  <div style={{ padding: '0.6rem' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                    {book.author && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{book.author}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
