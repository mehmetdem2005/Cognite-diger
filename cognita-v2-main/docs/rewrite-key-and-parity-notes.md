# Rewrite Key and Parity Notes

Bu dokuman, toplu temizleme/silme adimindan once korunmasi gereken kritik bilgileri toplar.

## 1) Environment Keys (sadece isimler)
Frontend + API katmaninda gorulen anahtar isimleri:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_API_URL
- GROQ_API_KEY
- OPENAI_API_KEY
- DEEPSEEK_API_KEY
- GEMINI_API_KEY
- NEXT_PUBLIC_AI_PROVIDER
- NEXT_PUBLIC_ENV
- NODE_ENV
- PORT

Backend ayar katmaninda kullanilan isimler:
- GROQ_API_KEY
- PORT
- DEBUG
- LOG_LEVEL
- ALLOWED_ORIGINS
- RATE_LIMIT_REQUESTS
- RATE_LIMIT_WINDOW_SECONDS
- CACHE_MAX_SIZE
- CACHE_TTL_SECONDS
- MAX_PDF_SIZE_MB
- GROQ_MODEL

Not:
- Burada sadece isim tutulur, deger tutulmaz.
- Secret degerler repo disi secret manager'da saklanir.

## 2) Goruntu Parity Icin Korunacak Kritik Dosyalar
- app/layout.tsx
- app/globals.css
- src/components/layout/AppShell.tsx
- src/components/ui/SideDrawer.tsx
- app/home/page.tsx
- src/components/ui/QuickActionButtons.tsx
- src/components/ui/ExploreByCategory.tsx

Bu dosyalar birebir kopyalanmak zorunda degil; davranis ve goruntu sozlesmesi korunmak zorunda.

## 3) Davranis Parity Sozlesmesi
- Theme:
  - light/dark/system ayni mantikta calismali
  - root `data-theme` davranisi korunmali
- Shell:
  - auth path'lerinde drawer gozukmemeli
  - diger path'lerde drawer acilabilir olmali
- Navigation:
  - route isimleri korunmali
  - mevcut menu hiyerarsisi korunmali
- Home:
  - profil ust alan, istatistik kutulari, quick action bolumu korunmali
- Reader:
  - ilerleme kaydi ve okuma akisinda gerileme olmamali

## 4) UI Freeze Checklist (silmeden once)
- [ ] Mobile screenshot seti alindi (360-430)
- [ ] Tablet screenshot seti alindi (768)
- [ ] Desktop screenshot seti alindi (>=1024)
- [ ] Kritik akislarda ekran video kaydi alindi
- [ ] Theme degisimleri kayda alindi
- [ ] Drawer acik/kapali durumlari kayda alindi

## 5) Teknik Freeze Checklist (silmeden once)
- [ ] DB schema export alindi
- [ ] RLS policy listesi export alindi
- [ ] API endpoint listesi ve ornek response alindi
- [ ] .env key isim listesi teyit edildi
- [ ] Build ve basic smoke test sonucu kaydedildi

## 6) Yeni Kod Kurallari (daha basit/duzenli/optimize)
- Inline style minimuma indir, tercihen sifir
- Ortak UI kit disinda tekrar eden CSS yazma
- Domain logic ile UI ayrimi zorunlu
- API response formati tek tip
- Her feature icin minumum 1 e2e kritik senaryo
- Perf olcumu olmayan kod "tamamlandi" sayilmaz

## 7) Delete-to-Rebuild Guvenli Akis
1. Dokumanlar tamam
2. Snapshot dosyalari al
3. Rebuild branch ac
4. Yeni iskeleti kur
5. Feature bazli migration yap
6. Parity testi gecen feature'da legacy sil
7. Final cutover ve cleanup
