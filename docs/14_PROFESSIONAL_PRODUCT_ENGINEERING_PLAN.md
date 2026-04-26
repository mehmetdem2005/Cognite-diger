# 14 — Profesyonel Ürün Mühendisliği Planı

Bu doküman, projenin amatör prototipten gerçek, sürdürülebilir ve deploy edilebilir uygulamaya dönüşmesi için ana çalışma standardıdır.

## Nihai ürün hedefi

Fırsat Avcısı + Meclis Takip uygulaması şu özelliklere sahip profesyonel bir web uygulaması olacaktır:

```txt
Güvenli
Hukuka uyumlu
Mobil uyumlu
Deploy edilebilir
Test edilebilir
Ölçeklenebilir
Gözlemlenebilir
Modüler
Bakımı kolay
```

## Değişmeyen ana kararlar

Şu kararlar korunacak:

```txt
Backend: FastAPI
Veri modeli: Pydantic
Başlangıç DB: SQLite
İleri DB hedefi: PostgreSQL
Frontend: Vanilla HTML/CSS/JS, sonra gerekirse React/Vite
Scheduler: APScheduler, sonra gerekirse queue/worker
Veri toplama: sadece izinli/resmî/feed/API kaynakları
```

## Ürün modülleri

### 1. Fırsat Avcısı

Amaç: İzinli veri kaynaklarından gelen konut, arsa, işyeri/ofis ve araç verilerini puanlayıp sıralamak.

Profesyonel beklenti:

```txt
Kaynak adaptörleri modüler olacak
Aynı ilan tekrar eklenmeyecek
Her ilan açıklanabilir puan alacak
Eksik veri ve risk seviyesi gösterilecek
Filtreler hızlı ve anlaşılır olacak
```

### 2. Veri Kaynakları

Amaç: Manuel girişe bağımlı kalmadan izinli JSON/RSS/API/feed kaynaklarını senkronize etmek.

Profesyonel beklenti:

```txt
Kaynak durumu takip edilecek
Son hata gösterilecek
Son senkron zamanı tutulacak
Toplu ve tekil sync olacak
Scheduler ile otomatik sync olacak
```

### 3. Meclis Takip

Amaç: Belediye karar PDF/metinlerini tarayıp anahtar kelime bağlamlarını göstermek.

Profesyonel beklenti:

```txt
Metin tarama hızlı olacak
PDF işleme stream tabanlı olacak
OCR gerekiyorsa kullanıcıya açık uyarı verilecek
Büyük PDF'ler için background job planı olacak
```

## Faz planı

### Faz 1 — Sertleştirme ve kalite kapıları

Hedef: Kodun bozulmadan büyümesini sağlamak.

Yapılacaklar:

```txt
pyproject.toml
ruff / pytest altyapısı
test klasörü
scoring testleri
scanner testleri
feed normalizasyon testleri
Makefile veya scripts komutları
CI hazırlığı
```

Çıkış kriteri:

```txt
pytest geçiyor
ruff check geçiyor
uygulama lokal ve Docker ile başlıyor
```

### Faz 2 — Veritabanı profesyonelleştirme

Hedef: SQLite ile devam ederken PostgreSQL'e geçişi kolaylaştırmak.

Yapılacaklar:

```txt
Repository katmanı
DB interface ayrımı
Migration sistemi
PostgreSQL uyumlu şema tasarımı
SQLite -> PostgreSQL geçiş notları
```

Çıkış kriteri:

```txt
Kod doğrudan sqlite3 çağrılarına yayılmıyor
Veritabanı operasyonları tek katmanda yönetiliyor
```

### Faz 3 — Background job mimarisi

Hedef: Büyük PDF ve uzun feed senkronizasyonlarında request timeout riskini kaldırmak.

Yapılacaklar:

```txt
jobs tablosu
job status endpointleri
background worker başlangıcı
sync job
pdf scan job
hata retry politikası
```

Çıkış kriteri:

```txt
Uzun işlem kullanıcı isteğini kilitlemiyor
Kullanıcı iş durumunu takip edebiliyor
```

### Faz 4 — Auth ve kullanıcı izolasyonu

Hedef: Her kullanıcının kendi veri kaynakları, kayıtlı aramaları ve ilan havuzu olması.

Yapılacaklar:

```txt
Kullanıcı modeli
Session/JWT planı
Auth middleware
user_id kolonları
Veri erişim izolasyonu
```

Çıkış kriteri:

```txt
Kullanıcı A, kullanıcı B'nin verisini göremez
```

### Faz 5 — Frontend ürün kalitesi

Hedef: Vanilla JS arayüzü profesyonel kullanılabilirlik seviyesine getirmek.

Yapılacaklar:

```txt
Bileşen mantığına ayrılmış JS dosyaları
Loading state
Error state
Empty state
Form validation
Mobil bottom navigation
Erişilebilir renk/kontrast
```

Çıkış kriteri:

```txt
Mobilde tek elle kullanılabilir
Hata mesajları anlaşılır
Her işlemde kullanıcı geri bildirim alır
```

### Faz 6 — Production gözlemlenebilirlik

Hedef: Canlı sistemde sorunlar izlenebilir olsun.

Yapılacaklar:

```txt
Structured logging
Request id
Health/readiness endpoint
Scheduler job logları
Kaynak sync metrikleri
```

Çıkış kriteri:

```txt
Hata olduğunda hangi kaynakta, hangi işlemde olduğu anlaşılır
```

## Kod standartları

Her yeni özellik için şu kurallar geçerli:

```txt
Önce model/contract
Sonra servis katmanı
Sonra API endpoint
Sonra frontend bağlama
Sonra test
Sonra dokümantasyon
```

## Hukuki güvenlik standardı

Aşağıdaki özellikler yapılmayacak:

```txt
CAPTCHA aşma
Gizli HTML scraping
CORS kısıtı dolanma
İzinsiz telefon/adres toplama
Kullanım şartı baypası
```

Aşağıdaki özellikler yapılacak:

```txt
Resmî API
İzinli JSON/RSS/XML feed
E-posta alarmı entegrasyonu
Partner veri entegrasyonu
Kullanıcının kendi sahip olduğu veri export/import akışı
```

## Öncelik sırası

En doğru geliştirme sırası:

```txt
1. Test ve kalite altyapısı
2. DB soyutlama / migration hazırlığı
3. Job sistemi
4. Auth
5. Frontend modülerleşme
6. PostgreSQL geçişi
7. E-posta alarmı adaptörü
8. Groq analiz modülü
9. PWA / Android wrapper
```

## Profesyonel başarı ölçütleri

Bu proje profesyonel kabul edilmek için şu seviyeye gelmeli:

```txt
Tek komutla lokal kurulum
Tek komutla test
Tek komutla Docker run
Açık environment ayarları
Hata durumunda anlaşılır mesaj
Kayıp veri riski düşük
Feed tekrarlarını önleme
Kullanıcı verisi izolasyonu
Production domain CORS ayarı
Dokümante edilmiş veri politikası
```
