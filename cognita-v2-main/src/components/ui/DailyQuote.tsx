'use client'
import { useState, useEffect } from 'react'
import { getStoredLocale, Locale } from '@/lib/i18n'

const QUOTES_TR = [
  { text: "Bir kitap yüz arkadaştan iyidir.", author: "Abdülkadir Geylani" },
  { text: "Okumak, başka bir hayat yaşamaktır.", author: "Gustave Flaubert" },
  { text: "Kitaplar, insanlığın en iyi arkadaşlarıdır.", author: "Thomas Carlyle" },
  { text: "Okuyan insan, her gün biraz daha özgürleşir.", author: "Franz Kafka" },
  { text: "Bir kitap bitirmek, bir dünyayı keşfetmektir.", author: "Voltaire" },
  { text: "Kitap okuyan insan, hiçbir zaman yalnız kalmaz.", author: "Fyodor Dostoyevski" },
  { text: "Bugünün okuyucusu, yarının lideridir.", author: "Margaret Fuller" },
  { text: "Bir kitap, uykuda bile düşünen bir beyindir.", author: "Victor Hugo" },
]

const QUOTES_EN = [
  { text: 'A book is better than a hundred friends.', author: 'Abdulkadir Geylani' },
  { text: 'Reading is living another life.', author: 'Gustave Flaubert' },
  { text: 'Books are humanity\'s best friends.', author: 'Thomas Carlyle' },
  { text: 'A reader becomes a little freer each day.', author: 'Franz Kafka' },
  { text: 'Finishing a book is discovering a world.', author: 'Voltaire' },
  { text: 'A person who reads is never truly alone.', author: 'Fyodor Dostoyevski' },
  { text: 'Today\'s reader is tomorrow\'s leader.', author: 'Margaret Fuller' },
  { text: 'A book is a mind that thinks even in sleep.', author: 'Victor Hugo' },
]

export default function DailyQuote() {
  const [locale, setLocale] = useState<Locale>(() => (typeof window !== 'undefined' ? getStoredLocale() : 'tr'))
  const [quote, setQuote] = useState(QUOTES_TR[0])

  useEffect(() => {
    const selectQuote = (loc: Locale) => {
      const source = loc === 'en' ? QUOTES_EN : QUOTES_TR
      const idx = new Date().getDate() % source.length
      setQuote(source[idx])
    }

    selectQuote(locale)

    const onLanguageChanged = () => {
      const next = getStoredLocale()
      setLocale(next)
      selectQuote(next)
    }

    window.addEventListener('storage', onLanguageChanged)
    window.addEventListener('cognita-language-changed', onLanguageChanged)
    return () => {
      window.removeEventListener('storage', onLanguageChanged)
      window.removeEventListener('cognita-language-changed', onLanguageChanged)
    }
  }, [locale])

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
