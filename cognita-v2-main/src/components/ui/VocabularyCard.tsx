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
      className="card"
    >
      <div className="flex items-center justify-between mb-2">
        <strong className="text-base text-text-primary font-bold">{word}</strong>
        <span className="text-xs text-text-muted font-semibold">{level || 'genel'}</span>
      </div>
      <p className="text-sm text-text-secondary mb-2">{meaning}</p>
      {example && <p className="text-xs text-text-muted mb-3">{example}</p>}
      <div className="flex gap-2">
        <button
          className={`btn-primary text-xs flex-1 ${isLearned ? 'opacity-70' : ''}`}
          onClick={onLearned}
        >
          Öğrendim
        </button>
        <button className="btn-secondary text-xs flex-1" onClick={onReview}>
          Tekrar et
        </button>
      </div>
    </motion.div>
  )
}
