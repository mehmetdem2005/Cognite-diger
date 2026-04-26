# Fırsat Avcısı + Meclis Takip

Mobil uyumlu, sekmeli, backend destekli fırsat ve belediye karar takip uygulaması.

Bu repo artık eski Cognita içeriği için değil; yeni proje için temiz başlangıç deposudur.

## Teknoloji yığını

```txt
Backend: FastAPI + Pydantic + SQLite
Server: Uvicorn
Scheduler: APScheduler
Feed çekme: httpx
PDF: pypdf + python-multipart
Frontend: Vanilla HTML/CSS/JavaScript
Deploy: Docker / VPS / Render benzeri Python web service
```

## Ana modüller

1. **Fırsat Avcısı**
   - Konut, arsa, işyeri/ofis ve araç kategorileri
   - Filtreleme, sıralama, favori, puanlama
   - JSON/RSS izinli veri kaynaklarından otomatik senkronizasyon

2. **Meclis Takip**
   - PDF veya metin tarama
   - Türkçe karakter toleranslı anahtar kelime arama
   - Bağlam gösterimi

3. **Veri Kaynakları**
   - JSON Feed ekleme
   - RSS / açık feed ekleme
   - Tek kaynak senkronizasyonu
   - Tüm kaynakları senkronize etme
   - Scheduler ile periyodik otomatik senkronizasyon

## Hukuki veri politikası

Bu proje, sahibinden.com, arabam.com, hepsiemlak vb. sitelerden gizli scraping, CAPTCHA aşma, CORS dolanma veya izinsiz toplu veri çekme üzerine kurulmaz.

Desteklenen güvenli yollar:

- Resmî API
- Yetkili JSON/XML feed
- RSS / açık veri
- E-posta alarmı entegrasyonu
- İzinli iş ortağı entegrasyonları
- Resmî arama linki oluşturma

Desteklenmeyen yollar:

- CAPTCHA aşma
- Gizli HTML scraping
- CORS kısıtı dolanma
- İzinsiz telefon/adres toplama botu
- Kullanım şartlarını baypas eden otomasyon

## Klasör yapısı

```txt
backend/                    FastAPI API, SQLite, puanlama, kaynak adaptörleri
backend/sources/            JSON/RSS feed adaptörleri
backend/services/           Senkronizasyon servisleri
frontend/                   Mobil uyumlu HTML/CSS/JS arayüz
docs/                       Mimari ve veri politikası
run.py                      Lokal başlatma dosyası
Dockerfile                  Production container
.env.example                Ortam değişkeni örneği
```

## Lokal çalıştırma

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp .env.example .env
python run.py
```

Sonra tarayıcıda aç:

```txt
http://127.0.0.1:8000
```

Alternatif Uvicorn komutu:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker ile çalıştırma

```bash
docker build -t firsat-avcisi .
docker run --env-file .env -p 8000:8000 -v $(pwd)/data:/app/data firsat-avcisi
```

Tarayıcı:

```txt
http://127.0.0.1:8000
```

## Production ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyala ve düzenle.

Önemli değişkenler:

```txt
ENVIRONMENT=production
CORS_ALLOWED_ORIGINS=https://senin-domainin.com
CORS_ALLOW_CREDENTIALS=false
ENABLE_SCHEDULER=true
SOURCE_SYNC_INTERVAL_MINUTES=60
DATA_DIR=data
```

Production'da `CORS_ALLOWED_ORIGINS=*` kullanmak yerine gerçek domain yazılmalıdır.

## Scheduler

Scheduler backend açılınca çalışır.

Varsayılan:

```txt
SOURCE_SYNC_INTERVAL_MINUTES=60
```

Minimum 5 dakikaya zorlanır. Kapatmak için:

```txt
ENABLE_SCHEDULER=false
```

## Veri kaynağı feed formatı

JSON feed şu yapılardan birini destekler:

```json
{
  "listings": [
    {
      "external_id": "abc-1",
      "category": "arsa",
      "title": "Uygun arsa",
      "price": 1250000,
      "currency": "TRY",
      "city": "Adana",
      "district": "Seyhan",
      "neighborhood": "Gürselpaşa",
      "listing_url": "https://example.com/ilan/abc-1",
      "image_url": "https://example.com/image.jpg",
      "properties": { "m2": 500, "imar": "konut" }
    }
  ]
}
```

Alternatif olarak direkt liste de olabilir:

```json
[
  {
    "external_id": "abc-1",
    "title": "Uygun konut",
    "price": 2500000,
    "category": "konut"
  }
]
```

## Meclis PDF notu

PDF için sabit MB limiti yoktur. Gerçek sınır, sunucunun RAM/disk/timeout kapasitesine bağlıdır. Çok büyük PDF'ler için ileride background job/queue sistemi eklenecektir.

## Sonraki aşamalar

1. PostgreSQL geçiş hazırlığı
2. Auth sistemi
3. Background job queue
4. E-posta alarmı adaptörü
5. Groq analiz modülü
6. PWA / Android wrapper
