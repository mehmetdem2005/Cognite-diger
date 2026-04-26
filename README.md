# Fırsat Avcısı + Meclis Takip

Mobil uyumlu, sekmeli, backend destekli fırsat ve belediye karar takip uygulaması.

## Hedef

Bu repo artık eski Cognita içeriği için değil; yeni proje için temiz başlangıç deposudur.

Uygulama iki ana modülden oluşur:

1. **Fırsat Avcısı**: Konut, arsa, işyeri/ofis ve araç ilanlarını kayıt, filtreleme, puanlama ve karşılaştırma.
2. **Meclis Takip**: Belediye karar linkleri, PDF/metin tarama, anahtar kelime takibi ve geçmiş kayıtları.

## Hukuki veri politikası

Bu proje, sahibinden.com, arabam.com, hepsiemlak vb. sitelerden gizli scraping, CAPTCHA aşma, CORS dolanma veya izinsiz toplu veri çekme üzerine kurulmaz.

Desteklenen güvenli yollar:

- Resmî API veya izinli veri feed'i
- Kullanıcının uygulama içinde kendi açtığı resmî sayfayı görüntülemesi
- Kullanıcının kendi eklediği manuel ilan kayıtları
- Arama linki oluşturma ve resmî siteye yönlendirme
- İzinli iş ortağı entegrasyonları

## Klasör yapısı

```txt
backend/      FastAPI API, SQLite, puanlama, kaynak adaptörleri
frontend/     Mobil uyumlu HTML/CSS/JS arayüz
docs/         Mimari ve veri politikası
run.py        Tek komutla lokal başlatma
```

## Lokal çalıştırma

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
python run.py
```

Sonra tarayıcıda aç:

```txt
http://127.0.0.1:8000
```

## İlk sürüm kapsamı

- Mobil sekmeli arayüz
- Fırsat Avcısı kategori mimarisi
- Manuel ilan havuzu
- Kelepir puanlama motoru
- Resmî arama linki oluşturucu
- SQLite veri saklama
- Hukuka uygun veri kaynağı katmanı
- Meclis Takip için temel iskelet

## Sonraki aşamalar

1. Resmî veri sağlayıcı adaptörleri
2. Groq analiz modülü
3. PDF indirme/metin çıkarma/OCR
4. Bildirim ve scheduler
5. Android wrapper / PWA paketleme
