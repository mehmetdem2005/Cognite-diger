# 08 — Backend API Mimarisi

Bu doküman FastAPI backend yapısını, endpoint sınırlarını, modül görevlerini ve API sözleşmelerini tanımlar.

## Ana hedef

Backend, frontend'in doğrudan yapmaması gereken işleri üstlenir:

```txt
Veri saklama
Puanlama
PDF/metin işleme
Groq bağlantısı
Scheduler
İzinli kaynak adaptörleri
Rapor üretme
```

## Backend klasörleri

```txt
backend/
├── main.py
├── database.py
├── models.py
├── groq_utils.py
├── scheduler.py
├── pdf_utils.py
├── scanner.py
├── sources/
├── scoring/
├── services/
└── migrations/
```

## Modül görevleri

### main.py

FastAPI uygulama girişidir.

Görevleri:

- API başlatma
- Middleware ayarları
- Router bağlama
- Statik frontend servis etme

### database.py

Veritabanı bağlantısını yönetir.

Görevleri:

- SQLite bağlantısı
- Tablo oluşturma
- Temel CRUD fonksiyonları
- Migration tetikleme

### models.py

Pydantic modellerini tutar.

Görevleri:

- Request modelleri
- Response modelleri
- Kategori tipleri
- Validasyon

### scoring/

Fırsat puanlama motorudur.

Görevleri:

- Konut puanı
- Arsa puanı
- İşyeri puanı
- Araç puanı
- Risk etiketi
- Eksik bilgi puanı

### sources/

Veri kaynağı adaptörleridir.

Görevleri:

- Resmî API adaptörleri
- Partner feed adaptörleri
- Manuel veri normalleştirme
- Kaynak izin modu kontrolü

### groq_utils.py

Groq ile konuşma katmanıdır.

Görevleri:

- İlan yorumlama
- Meclis kararı özetleme
- Risk analizi açıklama
- Sohbet cevabı üretme

Groq veri çekme motoru değildir. Veri yorumlama motorudur.

### pdf_utils.py

PDF işlemleri için kullanılır.

Görevleri:

- PDF indirme
- PDF metin çıkarma
- OCR gerekiyorsa OCR kuyruğuna alma

### scanner.py

Meclis karar tarama motorudur.

Görevleri:

- Anahtar kelime arama
- Regex tarama
- Bağlam metni çıkarma
- Sonuç skoru üretme

## API endpoint grupları

```txt
/api/health
/api/policy
/api/listings
/api/search-links
/api/saved-searches
/api/meclis
/api/chat
/api/settings
/api/export
```

## Health endpoint

```txt
GET /api/health
```

Amaç: Backend çalışıyor mu?

Response:

```json
{
  "ok": true,
  "project": "firsat-avcisi-meclis-takip"
}
```

## Policy endpoint

```txt
GET /api/policy
```

Amaç: Veri toplama politikasını frontend'e vermek.

Response:

```json
{
  "scraping": "Gizli scraping yok.",
  "allowed_sources": ["resmî API", "partner feed", "manuel kayıt"]
}
```

## Listings endpointleri

### Listele

```txt
GET /api/listings?category=arsa&sort=score_desc
```

### Ekle

```txt
POST /api/listings
```

Request:

```json
{
  "source": "manual",
  "category": "arsa",
  "title": "Seyhan'da uygun arsa",
  "price": 1500000,
  "currency": "TRY",
  "city": "Adana",
  "district": "Seyhan",
  "neighborhood": "",
  "listing_url": "",
  "image_url": "",
  "properties": {
    "m2": 400,
    "imar": "konut"
  },
  "contact": {},
  "notes": ""
}
```

Response:

```json
{
  "id": 1,
  "score": 82,
  "risk_level": "incelenebilir fırsat"
}
```

### Güncelle

```txt
PATCH /api/listings/{id}
```

### Sil

```txt
DELETE /api/listings/{id}
```

Silme işlemi frontend tarafında geri alma desteklemelidir.

## Search links endpoint

```txt
POST /api/search-links
```

Amaç: Kullanıcının filtrelerinden resmî site arama linkleri oluşturmak.

Bu endpoint veri kazımaz. Sadece link üretir.

Response:

```json
[
  {
    "source": "sahibinden",
    "url": "https://...",
    "note": "Resmî site arama sayfası. Veri kazıma yapılmaz."
  }
]
```

## Saved searches endpointleri

```txt
GET /api/saved-searches
POST /api/saved-searches
PATCH /api/saved-searches/{id}
DELETE /api/saved-searches/{id}
```

Amaç: Kullanıcının kayıtlı filtrelerini yönetmek.

## Meclis endpointleri

```txt
POST /api/meclis/scan
GET /api/meclis/history
GET /api/meclis/history/{id}
```

İlk sürümde `/api/meclis/scan` iskelet döner. Sonraki fazda PDF indirme, OCR ve tarama eklenecek.

## Chat endpointleri

```txt
POST /api/chat/listing
POST /api/chat/meclis
POST /api/chat/free
```

Amaç: Groq ile bağlama göre konuşmak.

Kurallar:

- Groq'a gereksiz kişisel veri gönderilmez.
- Telefon ve açık adres gibi veriler maskeleme gerektirebilir.
- Cevap yatırım/hukuk tavsiyesi olarak sunulmaz.

## Settings endpointleri

```txt
GET /api/settings
PATCH /api/settings
```

Ayarlar:

```txt
theme
groq_model
last_city
last_category
notification_enabled
```

## Export endpointleri

```txt
GET /api/export/listings.json
GET /api/export/listings.csv
GET /api/export/report.html
```

## Hata response standardı

Tüm hatalar aynı formatta dönmelidir.

```json
{
  "error": true,
  "code": "INVALID_PRICE",
  "message": "Fiyat alanına yalnızca sayı gir.",
  "details": {}
}
```

## HTTP durum kodları

```txt
200: Başarılı
201: Oluşturuldu
400: Hatalı istek
401: Yetkisiz
404: Bulunamadı
409: Çakışma / aynı kayıt
422: Validasyon hatası
500: Sunucu hatası
```

## Güvenlik kuralları

- API anahtarı frontend koduna gömülmez.
- `.env` dosyası GitHub'a gönderilmez.
- CORS ilk lokal sürümde açık olabilir; deploy aşamasında kısıtlanır.
- Kişisel veri loglanmaz.

## API geliştirme sırası

```txt
1. listings CRUD
2. scoring response
3. search-links
4. saved-searches
5. settings
6. meclis scan
7. chat
8. export
9. scheduler
```

## Backend kontrol listesi

```txt
Endpoint tek görev yapıyor mu?
Response modeli net mi?
Hata formatı standart mı?
Kişisel veri loglanıyor mu?
Kaynak izin modu kontrol ediliyor mu?
Frontend bu endpointi kolay kullanabilir mi?
```
