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
    <div className="card">
      <div className="text-2xl font-bold text-text-primary mb-4">{fmt(live)}</div>
      <div className="flex gap-2">
        {!isRunning ? (
          <button className="btn-primary text-sm flex-1" onClick={onStart}>Başlat</button>
        ) : (
          <button className="btn-primary text-sm flex-1" onClick={onStop}>Duraklat</button>
        )}
        <button className="btn-secondary text-sm flex-1" onClick={onReset}>Sıfırla</button>
      </div>
    </div>
  )
}
