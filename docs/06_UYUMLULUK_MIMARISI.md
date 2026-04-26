# 06 — Uyumluluk Mimarisi

Bu doküman uygulamanın mobil, masaüstü, tarayıcı, PWA, erişilebilirlik, performans ve veri uyumluluğu kurallarını tanımlar.

## Ana hedef

Uygulama mümkün olduğunca çok cihazda sorunsuz çalışmalı; özellikle Android telefonlarda rahat kullanılmalıdır.

## Desteklenecek ortamlar

İlk hedef ortamlar:

```txt
Android Chrome
Android WebView / Custom Tabs
Masaüstü Chrome
Masaüstü Edge
Masaüstü Firefox
```

İkincil hedef:

```txt
iOS Safari
PWA ana ekran modu
Tablet tarayıcıları
```

## Mobil öncelik

Tasarım önce mobil için yapılır, sonra masaüstüne genişletilir.

Kırılma noktaları:

```txt
0-480px: küçük telefon
481-768px: büyük telefon / küçük tablet
769-1024px: tablet
1025px+: masaüstü
```

## Responsive kurallar

- Mobilde tek kolon.
- Tablette iki kolon olabilir.
- Masaüstünde liste + detay paneli kullanılabilir.
- Alt navigasyon mobilde görünür.
- Sidebar masaüstünde görünür.
- Uzun tablolar mobilde kart görünümüne dönüşür.

## PWA uyumluluğu

PWA hedefleri:

```txt
Ana ekrana eklenebilir
Temel arayüz çevrimdışı açılabilir
Geçmiş kayıtlar çevrimdışı görülebilir
Ayarlar cihazda saklanabilir
```

İlk sürümde PWA şart değildir, ancak mimari buna uygun olmalıdır.

## Backend uyumluluğu

Backend ilk sürümde lokal çalışır.

```txt
Python 3.11+
FastAPI
SQLite
Uvicorn
```

Sonraki fazda:

```txt
PostgreSQL
Docker
Render / Railway / VPS
Background worker
Push notification
```

## Veri uyumluluğu

Veri modeli kategori bağımsız temel alanlara sahip olmalıdır.

Ortak ilan alanları:

```txt
id
source
category
title
price
currency
city
district
neighborhood
listing_url
image_url
properties
contact
notes
score
risk_level
created_at
```

Kategoriye özel bilgiler `properties` içinde tutulur.

Bu sayede yeni kategori eklemek kolay olur.

## Kaynak adaptörü uyumluluğu

Her veri kaynağı aynı iç formata çevrilir.

Adaptör çıkışı:

```txt
source
category
title
price
location
properties
contact
images
url
legal_mode
```

Kurallar:

- Her adaptör izinli veri kaynağına dayanır.
- Adaptör HTML scraping yapmaz.
- Adaptör kaynak adını ve veri modunu belirtir.
- Eksik bilgi `null` bırakılır, uydurulmaz.

## Tarayıcı API uyumluluğu

Kritik işlevler sadece modern ama yaygın API'lerle yapılır.

Kullanılabilecekler:

```txt
fetch
localStorage
IndexedDB
Service Worker
File API
URL API
```

Dikkatli kullanılacaklar:

```txt
Periodic Background Sync
Push API
Clipboard API
Notification API
```

Çünkü her cihazda aynı çalışmayabilir.

## Arka plan çalışma uyumluluğu

PWA arka plan görevleri güvenilir değildir. Gerçek otomatik takip backend scheduler ile yapılmalıdır.

Doğru model:

```txt
Backend scheduler düzenli kontrol eder.
Frontend sadece sonuçları gösterir.
Bildirim servisi kullanıcıyı uyarır.
```

## Dosya ve karakter uyumluluğu

Tüm dosyalar UTF-8 olmalıdır.

Zorunlu:

```txt
HTML charset utf-8
Python dosyaları UTF-8
JSON ensure_ascii false kullanılabilir
Türkçe karakterler korunur
```

## Performans uyumluluğu

Mobilde düşük güçlü cihazlar düşünülmelidir.

Kurallar:

- İlk yükleme hafif olmalı.
- Gereksiz kütüphane eklenmemeli.
- Liste çok uzarsa sanallaştırma veya sayfalama yapılmalı.
- Görseller lazy-load olmalı.
- Büyük PDF/OCR işleri frontend yerine backend tarafına alınmalı.

## Ağ uyumluluğu

Zayıf internet durumunda uygulama düzgün davranmalıdır.

Kurallar:

- Kaydetme işlemi başarısızsa kullanıcı bilgilendirilir.
- Tekrar dene butonu olur.
- Local kayıt desteklenir.
- Yükleniyor durumu gösterilir.

## Erişilebilirlik uyumluluğu

- Kontrast yeterli olmalı.
- Butonlar klavye ile seçilebilir olmalı.
- Form label kullanılmalı.
- Görsellerde alt metin olmalı.
- Sadece renk ile anlam verilmemeli.
- Hata mesajı ilgili alanın yanında gösterilmeli.

## Hukuki uyumluluk

Uygulama veri çekme konusunda şu kurala uyar:

```txt
İzin yoksa otomatik toplu veri çekme yok.
```

Desteklenen güvenli yöntemler:

- Resmî API
- Yetkili veri feed'i
- Kullanıcı tarafından girilen kayıt
- Resmî arama linki
- Uygulama içi güvenli görüntüleme

## Güvenlik uyumluluğu

İlkeler:

- API anahtarları frontend koduna gömülmez.
- Kullanıcı verisi gereksiz yere dışarı gönderilmez.
- Kişisel veri dikkatli işlenir.
- Telefon ve adres gibi alanlar izinli kaynak olmadıkça otomatik toplanmaz.

## Test uyumluluğu

Her ana özellik şu ortamlarda test edilir:

```txt
Android Chrome küçük ekran
Android Chrome büyük ekran
Masaüstü Chrome
Masaüstü Firefox
Dar ekran responsive test
Zayıf internet simülasyonu
```

## Uyumluluk kontrol listesi

```txt
Mobilde taşma var mı?
Alt navigasyon düzgün mü?
Türkçe karakterler doğru mu?
Formlar telefonda kolay dolduruluyor mu?
Düşük internette hata mesajı var mı?
Liste çok uzayınca performans düşüyor mu?
Backend olmadan temel ekran açılıyor mu?
Veri modeli kategori genişletmeye uygun mu?
Kaynak adaptörü hukuka uygun mu?
```
