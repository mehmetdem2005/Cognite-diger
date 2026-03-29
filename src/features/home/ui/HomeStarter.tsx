import { Button } from '@/shared/ui/Button'

export function HomeStarter() {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cognita Rebuild</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Ana mimari ve iskelet basladi</h1>
      <p className="mt-3 text-base text-slate-600">
        Eski kod tabanindan bagimsiz, feature-based duzenle temiz bir temel olusturuldu.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button>Auth modulu</Button>
        <Button variant="secondary">Reader core</Button>
      </div>
    </section>
  )
}
