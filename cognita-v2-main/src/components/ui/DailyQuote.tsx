'use client'
import { useState, useEffect } from 'react'

const QUOTES = [
  { text: "Bir kitap yüz arkadaştan iyidir.", author: "Abdülkadir Geylani" },
  { text: "Okumak, başka bir hayat yaşamaktır.", author: "Gustave Flaubert" },
  { text: "Kitaplar, insanlığın en iyi arkadaşlarıdır.", author: "Thomas Carlyle" },
  { text: "Okuyan insan, her gün biraz daha özgürleşir.", author: "Franz Kafka" },
  { text: "Bir kitap bitirmek, bir dünyayı keşfetmektir.", author: "Voltaire" },
  { text: "Kitap okuyan insan, hiçbir zaman yalnız kalmaz.", author: "Fyodor Dostoyevski" },
  { text: "Bugünün okuyucusu, yarının lideridir.", author: "Margaret Fuller" },
  { text: "Bir kitap, uykuda bile düşünen bir beyindir.", author: "Victor Hugo" },
]

export default function DailyQuote() {
  const [quote, setQuote] = useState(QUOTES[0])

  useEffect(() => {
    const idx = new Date().getDate() % QUOTES.length
    setQuote(QUOTES[idx])
  }, [])

  return (
    <div style={{ margin: '0.75rem 1rem 0', background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-5px', left: '12px', fontSize: '3rem', color: 'var(--bg-soft)', fontFamily: 'serif', lineHeight: 1, pointerEvents: 'none', opacity: 0.3 }}>"</div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text)', marginBottom: '0.75rem', position: 'relative', paddingTop: '0.5rem' }}>
        {quote.text}
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>— {quote.author}</p>
    </div>
  )
}
