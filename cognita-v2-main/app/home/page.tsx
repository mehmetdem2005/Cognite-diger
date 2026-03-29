import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-bg text-text px-6 py-10">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">Cognita Rewrite</p>
        <h1 className="mt-3 text-3xl font-bold">Yeni temel hazir</h1>
        <p className="mt-3 text-base text-text-soft">
          Eski frontend katmani kontrollu sekilde temizlendi. Bu ekran, sifirdan daha sade,
          duzenli ve optimize yapinin baslangic noktasi olarak ayarlandi.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/auth/login" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
            Giris
          </Link>
          <Link href="/auth/register" className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text">
            Kayit Ol
          </Link>
        </div>
      </section>
    </main>
  )
}
