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
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="card w-full max-w-2xl animate-fade-in">
        {done ? (
          <div className="text-center py-8">
            <h3 className="text-xl font-bold text-text-primary mb-2">Quiz Bitti!</h3>
            <p className="text-sm text-text-muted mb-6">Skorunuz: <span className="font-bold text-accent-primary text-lg">{score}</span></p>
            <button className="btn-primary" onClick={onClose}>Kapat</button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-text-primary">Soru {index + 1}/{total}</h3>
                <div className="h-1 flex-1 mx-3 bg-bg-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary transition-all duration-300"
                    style={{ width: `${((index + 1) / total) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-text-secondary">{q?.question}</p>
            </div>

            <div className="space-y-2 mb-6">
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
                  className="btn-secondary w-full text-left text-sm"
                >
                  {opt}
                </button>
              ))}
            </div>

            <button className="btn-ghost w-full text-center" onClick={onClose}>Kapat</button>
          </>
        )}
      </div>
    </div>
  )
}
