'use client'

import { useMemo, useState } from 'react'

type QuizQ = {
  question: string
  options: string[]
  answer: string
  explanation?: string
}

type Props = {
  open: boolean
  questions: QuizQ[]
  onClose: () => void
  onAnswer?: (payload: { question: QuizQ; selected: string; correct: boolean; index: number }) => void
}

export default function QuizModal({ open, questions, onClose, onAnswer }: Props) {
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  const q = questions[index]
  const total = questions.length
  const score = useMemo(() => `${correct}/${total}`, [correct, total])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 540, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '1rem' }}>
        {done ? (
          <>
            <h3 style={{ color: 'var(--text)', marginBottom: '0.6rem' }}>Quiz bitti</h3>
            <p style={{ color: 'var(--text-soft)', marginBottom: '0.9rem' }}>Skor: {score}</p>
            <button className="btn-primary" onClick={onClose}>Kapat</button>
          </>
        ) : (
          <>
            <h3 style={{ color: 'var(--text)', marginBottom: '0.6rem' }}>Soru {index + 1}/{total}</h3>
            <p style={{ color: 'var(--text-soft)', marginBottom: '0.9rem' }}>{q?.question}</p>
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {q?.options?.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    const isCorrect = opt === q.answer
                    onAnswer?.({ question: q, selected: opt, correct: isCorrect, index })
                    if (isCorrect) setCorrect((v) => v + 1)
                    if (index + 1 >= total) setDone(true)
                    else setIndex((v) => v + 1)
                  }}
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.55rem 0.7rem', color: 'var(--text)', textAlign: 'left' }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '0.8rem' }}>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>Kapat</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
