'use client'

import { useEffect, useState } from 'react'

type Props = {
  totalSeconds: number
  isRunning: boolean
  onStart: () => void
  onStop: () => void
  onReset: () => void
}

function fmt(total: number) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ReadingTimer({ totalSeconds, isRunning, onStart, onStop, onReset }: Props) {
  const [live, setLive] = useState(totalSeconds)

  useEffect(() => setLive(totalSeconds), [totalSeconds])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setLive((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.9rem' }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.6rem' }}>{fmt(live)}</div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!isRunning ? (
          <button className="btn-primary" onClick={onStart} style={{ padding: '0.4rem 0.7rem', borderRadius: 10 }}>Baslat</button>
        ) : (
          <button className="btn-primary" onClick={onStop} style={{ padding: '0.4rem 0.7rem', borderRadius: 10 }}>Duraklat</button>
        )}
        <button onClick={onReset} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.4rem 0.7rem', color: 'var(--text)' }}>Sifirla</button>
      </div>
    </div>
  )
}
