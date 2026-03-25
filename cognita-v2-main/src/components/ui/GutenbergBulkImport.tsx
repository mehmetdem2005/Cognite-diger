'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, BookOpen, Check, X, Loader } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function GutenbergBulkImport({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number; skipped: number; books: string[] } | null>(null)
  const [limit, setLimit] = useState(10)

  const handleImport = async () => {
    setLoading(true)
    setProgress([])
    setDone(false)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      setProgress(p => [...p, '📚 Gutenberg\'den kitaplar indiriliyor...'])
      setProgress(p => [...p, `⏳ ${limit} kitap işlenecek (her biri ~20 saniye)`])

      const res = await fetch('/api/gutenberg-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token, limit }),
      })

      const data = await res.json()

      if (!res.ok) {
        setProgress(p => [...p, `❌ Hata: ${data.error}`])
      } else {
        const r = data.results
        setResults(r)
        r.books.forEach((title: string) => {
          setProgress(p => [...p, `✅ ${title}`])
        })
        setProgress(p => [...p, `\n🎉 Tamamlandı! ${r.success} eklendi, ${r.skipped} atlandı, ${r.failed} başarısız`])
        setDone(true)
      }
    } catch (err: any) {
      setProgress(p => [...p, `❌ Hata: ${err.message}`])
    }

    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Gutenberg Toplu Yükleme
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Project Gutenberg'den 30 klasik eser otomatik olarak kataloga eklenir. 
          Her kitabın içeriği indirilir ve Flow'da kullanılır.
        </p>

        {/* Limit seçici */}
        {!loading && !done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-soft)' }}>
              Kaç kitap eklensin?
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[5, 10, 20, 30].map(n => (
                <button
                  key={n}
                  onClick={() => setLimit(n)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${limit === n ? 'var(--accent)' : 'var(--border)'}`,
                    background: limit === n ? 'rgba(64,93,230,0.1)' : 'var(--bg-soft)',
                    color: limit === n ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: '0.85rem',
                    fontWeight: limit === n ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ⏱ Tahmini süre: ~{Math.ceil(limit * 0.5)} dakika
            </p>
          </div>
        )}

        {/* Progress log */}
        {progress.length > 0 && (
          <div style={{
            background: 'var(--bg-soft)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '0.78rem',
            lineHeight: 1.8,
            color: 'var(--text-soft)',
            fontFamily: 'monospace',
          }}>
            {progress.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <span>İşleniyor...</span>
              </div>
            )}
          </div>
        )}

        {/* Sonuç */}
        {done && results && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1, background: 'rgba(22,163,74,0.1)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--green)' }}>{results.success}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--green)' }}>Eklendi</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(153,153,153,0.1)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>{results.skipped}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Atlandı</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(230,57,70,0.1)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--red)' }}>{results.failed}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--red)' }}>Başarısız</div>
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--border)', background: 'none', color: 'var(--text-soft)', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {done ? 'Kapat' : 'İptal'}
          </button>
          {!done && (
            <button
              onClick={handleImport}
              disabled={loading}
              style={{ flex: 2, padding: '0.75rem', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', border: 'none', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Yükleniyor...</> : <><Download size={16} /> Kitapları İndir</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
