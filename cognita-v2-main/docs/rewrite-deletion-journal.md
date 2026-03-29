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
