# Rewrite Deletion Journal

Bu dosya, "not al ve sil" kuralina gore silinen her eski parcayi kayit altina alir.

## Phase 1 - Legacy Frontend Cleanup (2026-03-29)

### Neden
- Sifirdan baslamak icin eski, karmasik ve daginik UI katmani temizleniyor.
- Not alinmayan yol silinmeyecek.
- Amaç: minimal, stabil ve yeniden insa edilebilir bir iskelet birakmak.

### Silinecek Alanlar (Not Alindi)
- `src/components/layout/*`
- `src/components/ui/*`
- `app/admin/*`
- `app/book/*`
- `app/catalog/*`
- `app/challenges/*`
- `app/clubs/*`
- `app/collections/*`
- `app/explore/*`
- `app/flow/*`
- `app/library/*`
- `app/notifications/*`
- `app/profile/*`
- `app/projects/*`
- `app/reader/*`
- `app/settings/*`
- `app/stats/*`
- `app/user/*`
- `app/vocabulary/*`
- `app/write/*`
- `app/home/*` (yenisi minimal olarak tekrar olusturulacak)

### Korunan Alanlar
- `docs/*` (tum plan/not dosyalari)
- `app/api/*`
- `app/auth/*`
- `app/globals.css`
- `backend/*`
- `supabase/*`
- `scripts/*`
- `src/lib/*`
- `src/store/*`

### Sonraki Adim
- `app/layout.tsx` sadelestirilir
- `app/page.tsx` minimal yonlendirme
- `app/home/page.tsx` sade ve temiz yeniden-yazim landing ekrani

## Phase 2 - Legacy Core Cleanup (2026-03-29)

### Neden
- "Teker teker hepsini not alip sil" talebine uygun olarak kalan eski cekirdek katmanlar temizlenir.
- Sadece bu bolumde notlanan yollar silinir.

### Tek Tek Silme Listesi (Not Alindi)
- [x] `app/api/*`
- [x] `app/auth/*`
- [x] `src/lib/*`
- [x] `src/store/*`
- [x] `backend/*`
- [x] `scripts/db/*`
- [x] `supabase/*`
- [x] `migrations/*`
- [x] `challenge_schema.sql`
- [x] `supabase_schema.sql`

### Korunacak Alanlar (Phase 2)
- `docs/*`
- `app/layout.tsx`
- `app/page.tsx`
- `app/home/page.tsx`
- Proje konfigurasyon dosyalari (`package.json`, `tsconfig.json`, `next.config.ts` vb.)

### Durum
- Phase 2 tek tek silme adimlari tamamlandi.
