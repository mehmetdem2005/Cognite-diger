# Cognita Rebuild Master Plan (V1)

## 1) Hedef
Bu planin amaci uygulamayi parca parca yamalamak yerine temiz bir mimari ile yeniden insa etmektir.
Ana hedefler:
- UI/UX tutarliligi ve tasarim sistemi
- Guvenilir veri modeli ve API standartlari
- Olceklenebilir frontend ve backend katmanlari
- Test, gozlemlenebilirlik ve release disiplini

## 2) Kapsam ve Ilkeler
- Rebuild yaklasimi: Greenfield + kontrollu migration
- Uretim kesintisi olmadan gecis: Strangler pattern
- Eski kod ile yeni kod yan yana yasayacak
- Her sprint sonunda canliya alinabilir artifakt cikacak

## 3) Hedef Mimari
### Frontend
- Next.js App Router (feature-based module yapisi)
- React 19 + TypeScript strict
- UI katmani: token tabanli design system
- Durum yonetimi: server state (fetch/cache) + lokal state (zustand)

### Backend
- Supabase (Postgres + Auth + RLS)
- API route standardi: request validation, auth guard, error envelope
- AI servis katmani: provider-agnostic orchestrator + usage tracking

### Shared
- Domain odakli klasorleme: `src/features/*`
- Ortak tipler ve validation schema'lari
- Logging, telemetry, rate limit standardi

## 4) Modul Haritasi (Yeniden Yazim Sirasi)
1. Kimlik ve profil cekirdegi (auth/profile/settings)
2. App shell ve navigasyon (layout/sidebar/header/bottom nav)
3. Home feed ve ozet kartlari
4. Reader core (book fetch, progress, annotations)
5. Catalog/explore/search
6. Social (clubs/leaderboard/notifications)
7. Challenges ve achievements
8. Admin panel

## 5) Teknik Standardlar
- TypeScript `strict` zorunlu
- Her endpointte zod validation
- RLS policy olmayan tablo canliya cikmaz
- UI komponentleri sadece design token kullanir
- PR merge gate:
  - lint
  - type-check
  - unit tests
  - smoke/e2e kritik akislar

## 6) Veri ve Migration Stratejisi
- Faz 0: mevcut schema envanteri ve bagimlilik haritasi
- Faz 1: yeni tablolari `v_next_*` prefix ile olustur
- Faz 2: dual-write (eski + yeni)
- Faz 3: read path'i yeniya al
- Faz 4: eski path deprecate ve sil

## 7) UI/UX Rebuild Stratejisi
- Tek kaynak: design-tokens + component library
- Inline style kullanimi kaldirilacak
- Spacing/typography/color semantik tokenlarla yonetilecek
- Responsive matrix:
  - 360-430 mobile
  - 768 tablet
  - 1024+ desktop

## 8) Test ve Kalite
- Unit: domain logic, helpers, validators
- Integration: API + DB policy + auth guard
- E2E: auth, home, reader, progress, challenge, profile
- Visual regression: kritik ekran screenshot karsilastirma

## 9) Operasyon
- Feature flag ile asamali acilis
- Error budget ve rollback plani
- KPI dashboard:
  - crash-free session
  - API p95 latency
  - reader completion rate
  - daily active readers

## 10) Faz Plani
### Faz A (1-2 hafta): Kesif ve Hazirlik
- Kod envanteri
- Domain ve API kontratlari
- Design token seti
- CI gate kurulumu

### Faz B (3-6 hafta): Core Rebuild
- Auth/profile
- App shell
- Home
- Reader core

### Faz C (2-4 hafta): Product Rebuild
- Catalog/explore
- Social
- Challenges
- Admin

### Faz D (1-2 hafta): Stabilizasyon
- Perf tuning
- Bug bash
- Data migration final
- Legacy code removal

## 11) Riskler ve Onlemler
- Risk: Kapsam sismesi
  - Onlem: Sprint scope freeze + MoSCoW
- Risk: Veri tutarsizligi
  - Onlem: dual-write monitor + reconciliation job
- Risk: UI tekrar bozulmasi
  - Onlem: design-system enforcement + visual tests

## 12) Cikis Kriteri
Rebuild tamamlandi sayilmasi icin:
- Kritik akislarin tamaminda e2e yesil
- Legacy kritik moduller kapatildi
- Yeni UI kit ile %100 ekran uyumu
- KPI hedefleri 2 hafta boyunca stabil

## 13) Silmeden Once Zorunlu Snapshot
Tum kodu silmeden once asagidaki snapshot zorunludur:
- UI parity screenshot paketi (mobile/tablet/desktop)
- Kritik flow video kayitlari:
  - login -> home
  - home -> reader -> progress
  - catalog -> book detail
  - profile/settings/theme degisimi
- API kontrat snapshot'i (request/response ornekleri)
- DB schema snapshot (tablo + RLS + trigger + function)
- Environment variable isim listesi (deger degil, sadece isim)

Bu snapshot olmadan toplu silme adimina gecilmez.

## 14) UI Parity Sozlesmesi (Degismeyecek Alanlar)
Yeniden yazimda goruntu ve davranis ayni kalmasi gereken cekirdek sozlesme:
- Tema davranisi: light/dark/system mantigi korunacak
- Global token semantigi: bg/text/border/accent adlandirmasi korunacak
- App shell davranisi: auth sayfalarinda drawer yok, digerlerinde drawer var
- Reader flow: acilis, ilerleme, not/annotation akisi bozulmayacak
- Navigation bilgi mimarisi: ana route yapisi korunacak

Not: Kod daha sade yazilabilir, ama kullanici deneyimi ve ekran hiyerarsisi ayni kalacak.

## 15) Sadelestirme Kurallari (Daha Basit + Duzenli)
- Inline style yasak (istisna: runtime hesaplanan cok ozel degerler)
- Feature-based mimari zorunlu: `src/features/<feature>`
- Komponentler:
  - `ui` (presentational)
  - `containers` (data/orchestration)
  - `services` (API + domain)
- API'de tek tip error envelope
- Tekrar eden logic helper/hook katmanina alinacak
- Dosya boyutu limiti (hedef):
  - component <= 250 satir
  - route handler <= 200 satir

## 16) Optimizasyon Hedefleri
- Bundle budget tanimla ve CI'da kontrol et
- DB query standardi: secici select, gereksiz kolon yok
- Cache stratejisi:
  - server response cache
  - stale-while-revalidate uygun endpointlerde
- Reader performansi:
  - lazy section load
  - heavy parsing background islemleri
- p95 API latency hedefi kritik endpointlerde olculur

## 17) Silme ve Yeniden Baslama Protokolu
Bu repo icin guvenli siralama:
1. Plan + snapshot + key listesi tamam
2. Rebuild branch ac (`rewrite/v1-core`)
3. Yeni iskeleti olustur
4. Eski kodu bir anda silmek yerine feature bazli devre disi birak
5. Her feature parity testini gecmeden legacy silme
6. Son cutover sonrasi legacy klasorleri temizle

Boylece "hepsini silip sifirdan" hedefi, veri ve davranis kaybi olmadan uygulanir.
