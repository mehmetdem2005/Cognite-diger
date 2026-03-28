'use client'

import { motion } from 'framer-motion'

type Props = {
  word: string
  meaning: string
  example?: string | null
  level?: string | null
  isLearned?: boolean
  onLearned?: () => void
  onReview?: () => void
}

export default function VocabularyCard({
  word,
  meaning,
  example,
  level,
  isLearned,
  onLearned,
  onReview,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '0.9rem',
        display: 'grid',
        gap: '0.55rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{word}</strong>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{level || 'genel'}</span>
      </div>
      <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem' }}>{meaning}</p>
      {example && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{example}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn-primary" onClick={onLearned} style={{ padding: '0.45rem 0.75rem', borderRadius: 10, opacity: isLearned ? 0.7 : 1 }}>
          Ogrendim
        </button>
        <button onClick={onReview} style={{ background: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.45rem 0.75rem' }}>
          Tekrar et
        </button>
      </div>
    </motion.div>
  )
}
