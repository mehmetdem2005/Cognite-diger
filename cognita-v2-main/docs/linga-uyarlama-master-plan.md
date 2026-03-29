# Cognita x Linga Uyarlama Master Plan

## 1) Vizyon
Cognita, pasif kitap okuma deneyimini etkileşimli bir öğrenme akışına dönüştürür:
- Paragraf/bolum bazli ilerleme
- Dokun-ogren kelime yardimi
- Bolum sonu alistirma
- Anlik geri bildirim
- Ilerleme ve aliskanlik analitigi

## 2) Uygulamaya Ozel Konumlandirma
Linga benzeri taraflar:
- Mikro adimlarla ilerleme
- Siklikla geri bildirim
- SRS tabanli tekrar

Cognita farki:
- Kitap odakli sosyal deneyim
- Yazar ve proje akislari
- AI destekli ozet, quiz ve tavsiye

## 3) Kullanim Akisi
### A. Onboarding ve Kutuphane
- Email + sosyal giris (Google, Apple)
- Ilgi alanina gore ilk kitap onerileri
- Kutuphane: Devam et, tamamlananlar, istek listesi

### B. Okuma Ekrani
- Tema, font, satir yuksekligi
- Dokun-ogren paneli: anlam, IPA, ornek, not
- Highlight, not, yer imi
- Sesli okuma ve hiz kontrolu

### C. Bolum Sonu Ogrenme
- Mini quiz
- Karakter iliski sorulari
- Ana fikir ve tahmin alistirmasi
- AI geri bildirimli acik uclu cevap

### D. Pekistirme
- Kelimelerim + SRS tekrar akisi
- Haftalik mini hedefler
- Rozetler

### E. Sosyal
- Kitap kulubu ve bolum tartismasi
- Highlight paylasimi (opsiyonel)

## 4) Mimari Esleme (Mevcut Koda Gore)
- Frontend: Next.js App Router + Zustand
- Auth/DB: Supabase + RLS
- AI: Groq/OpenAI provider manager
- Reader: app/reader/[id]/page.tsx

## 5) Ozellik Haritasi
### Hazir
- Reader temel deneyim
- Highlight/yer imi/not
- Flashcard uretimi
- Istatistik ve bazi sosyal aktiviteler

### Kismi
- Oneri sistemi
- Challenge/quiz yapisi
- Koleksiyonlar ve kelime defteri

### Eklenecek
- Bolum sonu quiz havuzu + attempt kaydi
- Okuma rehberi (tahmin, karakter, ana fikir)
- SRS tekrar zamanlayici
- Kitap kulubu odalari

## 6) Surumleme ve Kapsam
### Faz 1 (2-4 hafta)
- Reader Learning Core
- Kelime SRS v1
- Bolum sonu quiz v1
- API + DB migration

### Faz 2 (4-8 hafta)
- Okuma rehberi
- Topluluk kulup odalari
- Adaptif zorluk skoru

### Faz 3 (8-12 hafta)
- AI ogrenme koçu
- Gelismis tavsiye sistemi
- Mobil packaging hazirligi

## 7) KPI ve Basari Metrikleri
- Ortalama gunluk okuma suresi: 25+ dk
- Bolum sonu quiz tamamlama: %60+
- Kelime tekrar geri donus: %40+
- 30 gun retention: %25+

## 8) Riskler ve Onlemler
- Buyuk PDF/EPUB performansi: lazy chunk + background parse
- Telif riski: kullanici yuklemesi + public domain katalog
- AI maliyet: cache + token limit + model fallback

## 9) Operasyon
- Log: endpoint bazli latency + error class
- Guvenlik: RLS + rate-limit + abuse guard
- Gozlemlenebilirlik: dashboard + haftalik KPI raporu
