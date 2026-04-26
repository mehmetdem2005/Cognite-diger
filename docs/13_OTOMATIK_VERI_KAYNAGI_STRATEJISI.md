# 13 — Otomatik Veri Kaynağı Stratejisi

Bu doküman, Fırsat Avcısı modülünün manuel veri girişi olmadan nasıl otomatik çalışacağını tanımlar.

## Net hedef

Kullanıcı tek tek ilan girmek zorunda kalmayacak. Sistem otomatik veri alacak, filtreleyecek, puanlayacak ve gösterecek.

Ancak otomatik veri alma sadece izinli kaynaklarla yapılır.

## Otomatik ama uyumlu yollar

Desteklenen otomatik yollar:

```txt
Resmî API
Yetkili partner feed
İzinli XML/JSON feed
Kullanıcıya veya işletmeye ait ilan portföy export dosyası
E-posta ile gelen izinli ilan bildirimleri
RSS veya açık veri kaynağı
Kurumsal bayi/galeri/emlak ofisi entegrasyonu
```

## Manuel olmayan ana mimari

```txt
Kaynak adaptörü
    ↓
Otomatik senkronizasyon
    ↓
Normalleştirme
    ↓
Veritabanı
    ↓
Kelepir puanlama motoru
    ↓
Filtreli arayüz
    ↓
Bildirim / rapor
```

## Kaynak türleri

### 1. Resmî API

En güçlü ve temiz yöntemdir.

Örnek alanlar:

```txt
ilan başlığı
fiyat
konum
özellikler
görseller
ilan linki
güncellenme tarihi
```

Telefon/adres gibi kişisel alanlar yalnızca API ve kullanım şartları izin verirse alınır.

### 2. Partner feed

Emlak ofisi, galeri veya bayi kendi portföyünü XML/JSON olarak verebilir.

Örnek:

```txt
https://firma.com/ilanlar.xml
https://firma.com/feed.json
```

Bu feed izinli olduğu için otomatik çekilebilir.

### 3. E-posta bildirim entegrasyonu

Bazı siteler arama alarmı veya bildirim e-postası gönderir. Kullanıcı bu e-postaları uygulamaya yönlendirebilir.

Akış:

```txt
Kullanıcı sitede arama alarmı kurar
Site e-posta gönderir
Uygulama e-postayı okur
İlan linklerini çıkarır
Kullanıcının havuzuna ekler
```

Bu yöntem arka planda site kazımaz; kullanıcının kendi aldığı bildirimleri işler.

### 4. Açık RSS / açık veri

Bazı kaynaklar RSS veya açık veri sunabilir.

Bu durumda uygulama belirli aralıklarla feed'i kontrol eder.

### 5. Kullanıcının sahip olduğu export dosyası

Kullanıcı veya işletme kendi portföyünü CSV/JSON/XML olarak dışa aktarabiliyorsa, uygulama bunu otomatik içe alabilir.

## Yasak olan otomatik yollar

Aşağıdaki yöntemler otomatik sistemin parçası olmayacak:

```txt
CAPTCHA aşma
Gizli HTML scraping
CORS proxy ile kısıt dolanma
Telefon numarası toplama botu
İzinsiz toplu detay sayfası arşivleme
Kullanım şartlarını baypas eden bot
```

## Sahibinden ve benzeri siteler için gerçekçi yol

Eğer hedef sahibinden ve benzeri büyük sitelerde tam otomatik çalışmaksa üç seçenek vardır:

```txt
1. Resmî API / kurumsal entegrasyon almak
2. Site içi arama alarmı/e-posta bildirimlerini uygulamaya bağlamak
3. İzinli iş ortağı veya veri sağlayıcı feed'i kullanmak
```

Bu üç yöntem dışındaki izinsiz toplu otomasyon ürünün uzun vadeli çalışmasını riske atar.

## Uygulama içinde kullanıcı çıkmadan otomatik deneyim

Kullanıcı uygulamadan çıkmadan şunu görür:

```txt
Takip edilen kaynaklar
Son senkronizasyon zamanı
Yeni gelen ilan sayısı
En iyi fırsatlar
Riskli/eksik ilanlar
Bildirimler
```

Kullanıcı manuel ilan girmek zorunda kalmaz.

## Scheduler görevi

Backend scheduler şu işleri yapar:

```txt
Kayıtlı veri kaynaklarını belirli aralıklarla kontrol eder
Yeni ilanları alır
Aynı ilanı tekrar eklemez
Puanlama yapar
Bildirim üretir
Hata varsa kaynak durumunu günceller
```

## Kaynak adaptörü sözleşmesi

Her otomatik kaynak adaptörü şu bilgileri döndürür:

```json
{
  "source": "partner_feed",
  "source_mode": "authorized_feed",
  "external_id": "12345",
  "category": "arsa",
  "title": "",
  "price": 0,
  "currency": "TRY",
  "city": "",
  "district": "",
  "neighborhood": "",
  "listing_url": "",
  "image_url": "",
  "properties": {},
  "contact": {},
  "legal_meta": {
    "permission": true,
    "source_contract": "partner feed",
    "fetched_at": ""
  }
}
```

## İlk kod fazı

Manuel havuz yerine sıradaki teknik faz şu olacak:

```txt
1. sources/partner_feed.py
2. sources/rss_feed.py
3. sources/email_alerts.py
4. scheduler.py senkronizasyon işi
5. source_status tablosu
6. otomatik gelen ilanları puanlama
```

## Ürün kararı

Bu projede manuel giriş yardımcı özellik olarak kalabilir; ana hedef otomatik ve izinli kaynak senkronizasyonudur.
