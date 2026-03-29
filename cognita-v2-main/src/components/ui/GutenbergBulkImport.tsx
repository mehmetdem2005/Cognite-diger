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
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-accent" />
            <h2 className="text-base font-bold text-text">
              Gutenberg Toplu Yükleme
            </h2>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          Project Gutenberg'den 30 klasik eser otomatik olarak kataloga eklenir. 
          Her kitabın içeriği indirilir ve Flow'da kullanılır.
        </p>

        {/* Limit selector */}
        {!loading && !done && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-soft">
              Kaç kitap eklensin?
            </label>
            <div className="flex gap-2">
              {[5, 10, 20, 30].map(n => (
                <button
                  key={n}
                  onClick={() => setLimit(n)}
                  className={`flex-1 px-2 py-2 rounded-md border-1.5 text-xs ${
                    limit === n
                      ? 'border-accent bg-accent/10 text-accent font-bold'
                      : 'border-border bg-bg-soft text-text-muted'
                  } cursor-pointer hover:opacity-80 transition-all`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              ⏱ Tahmini süre: ~{Math.ceil(limit * 0.5)} dakika
            </p>
          </div>
        )}

        {/* Progress log */}
        {progress.length > 0 && (
          <div className="bg-bg-soft rounded-md p-3 max-h-[200px] overflow-y-auto text-xs leading-relaxed text-text-soft font-mono">
            {progress.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 mt-2">
                <Loader size={12} className="animate-spin text-accent" />
                <span>İşleniyor...</span>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {done && results && (
          <div className="flex gap-3">
            {/* Success */}
            <div className="flex-1 bg-green-500/10 rounded-md p-3 text-center">
              <div className="text-xl font-bold text-green-500">{results.success}</div>
              <div className="text-xs text-green-500">Eklendi</div>
            </div>
            {/* Skipped */}
            <div className="flex-1 bg-gray-500/10 rounded-md p-3 text-center">
              <div className="text-xl font-bold text-text-muted">{results.skipped}</div>
              <div className="text-xs text-text-muted">Atlandı</div>
            </div>
            {/* Failed */}
            <div className="flex-1 bg-red-500/10 rounded-md p-3 text-center">
              <div className="text-xl font-bold text-red-500">{results.failed}</div>
              <div className="text-xs text-red-500">Başarısız</div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-auto">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full border-1.5 border-border bg-transparent text-text-soft text-xs cursor-pointer hover:bg-bg-soft transition-colors"
          >
            {done ? 'Kapat' : 'İptal'}
          </button>
          {!done && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-[2] px-4 py-3 rounded-full bg-gradient-to-r from-accent to-accent-2 border-none text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-70 transition-all"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" /> Yükleniyor...
                </>
              ) : (
                <>
                  <Download size={16} /> Kitapları İndir
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
