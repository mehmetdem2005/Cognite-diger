# 07 — Veri ve Veritabanı Mimarisi

Bu doküman uygulamanın veri modelini, kayıt yapısını, SQLite başlangıç mimarisini ve ileride PostgreSQL/Supabase geçişine uygun tasarım kurallarını tanımlar.

## Ana hedef

Veri modeli sade başlayacak ama büyümeye uygun olacak. İlk sürüm SQLite ile çalışacak. Sonraki aşamada PostgreSQL veya Supabase'e geçerken temel alanlar bozulmayacak.

## Temel veri ilkeleri

```txt
Veri uydurulmaz.
Eksik bilgi null veya boş bırakılır.
Kategoriye özel alanlar properties içinde tutulur.
Kişisel veri alanları ayrı ve kontrollü tutulur.
Her kayıt kaynak bilgisini taşır.
```

## Ana tablolar

İlk sürümde şu tablolar yeterlidir:

```txt
listings
saved_searches
scan_history
app_settings
notes
comparison_items
```

## listings tablosu

İlan havuzunun ana tablosudur.

Alanlar:

```txt
id
source
source_mode
category
title
price
currency
city
district
neighborhood
listing_url
image_url
properties_json
contact_json
notes
score
risk_level
is_favorite
created_at
updated_at
```

## source alanı

Kaynağı belirtir.

Örnekler:

```txt
manual
sahibinden_official
hepsiemlak_official
arabam_official
partner_feed
google_search
```

## source_mode alanı

Verinin nasıl elde edildiğini belirtir.

```txt
manual_user_input
official_api
partner_feed
search_link
in_app_view
```

Yasaklı modlar:

```txt
hidden_scraping
captcha_bypass
cors_bypass
bulk_unauthorized_extract
```

Bu modlar sistemde kullanılmaz.

## category alanı

Desteklenen temel kategoriler:

```txt
konut
arsa
isyeri
arac
```

İleride eklenebilir:

```txt
tarla
villa
depo
motosiklet
ticari_arac
```

## properties_json

Kategoriye özel bilgileri taşır.

### Konut örneği

```json
{
  "m2": 120,
  "oda": "3+1",
  "bina_yasi": 5,
  "kat": 3,
  "isitma": "doğalgaz",
  "krediye_uygun": true
}
```

### Arsa örneği

```json
{
  "m2": 450,
  "imar": "konut imarlı",
  "tapu": "müstakil",
  "ada": "123",
  "parsel": "45",
  "yol_cephe": true
}
```

### Araç örneği

```json
{
  "marka": "Toyota",
  "model": "Corolla",
  "yil": 2018,
  "km": 85000,
  "yakit": "benzin",
  "vites": "otomatik",
  "hasar_kaydi": 0
}
```

## contact_json

İletişim bilgileri burada tutulur.

```json
{
  "name": "",
  "phone": "",
  "visible_permission": false
}
```

Kurallar:

- Telefon ve açık adres gibi alanlar kişisel veri sayılabilir.
- Otomatik toplanmaz.
- Sadece izinli kaynak veya kullanıcı girişiyle saklanır.

## saved_searches tablosu

Kayıtlı aramalar için kullanılır.

Alanlar:

```txt
id
name
category
filters_json
sort_mode
notification_enabled
created_at
updated_at
```

Örnek:

```json
{
  "city": "Adana",
  "district": "Seyhan",
  "category": "arsa",
  "min_price": 0,
  "max_price": 2000000,
  "min_m2": 250
}
```

## scan_history tablosu

Meclis ve fırsat işlemlerinin geçmişini tutar.

Alanlar:

```txt
id
kind
title
payload_json
created_at
```

kind değerleri:

```txt
listing_search
listing_import
meclis_scan
groq_analysis
export
```

## app_settings tablosu

Kullanıcı ayarlarını saklar.

Alanlar:

```txt
key
value_json
updated_at
```

Örnek ayarlar:

```txt
theme
last_city
last_category
groq_model
notification_enabled
```

## comparison_items tablosu

Karşılaştırmaya eklenen ilanları tutar.

Alanlar:

```txt
id
listing_id
group_name
created_at
```

## Veri dışa aktarma

Desteklenecek formatlar:

```txt
JSON
CSV
HTML rapor
```

## Veri içe aktarma

İlk sürümde JSON içe aktarma yeterlidir.

Kurallar:

- Bozuk JSON reddedilir.
- Eksik alanlar varsayılan değer alır.
- Aynı link tekrar eklenirse kullanıcıya sorulur.

## Migration politikası

Her veritabanı değişikliği versiyonlanmalıdır.

Önerilen yapı:

```txt
backend/migrations/001_initial.sql
backend/migrations/002_saved_searches.sql
backend/migrations/003_comparison.sql
```

## SQLite başlangıç kararı

SQLite seçilme sebebi:

- Kurulumu kolay.
- Telefonda/yerelde test edilebilir.
- Tek dosya veritabanı üretir.
- MVP için yeterlidir.

## PostgreSQL geçiş kararı

Şu ihtiyaçlar çıkarsa PostgreSQL'e geçilir:

```txt
Çok kullanıcı
Sunucu deploy
Bildirim sistemi
Büyük veri
Eş zamanlı işlem
Rol tabanlı yetki
```

## Veri kontrol listesi

```txt
Kaynak bilgisi var mı?
Veri modu yasal mı?
Kategori doğru mu?
Eksik bilgi uydurulmadan bırakıldı mı?
Kişisel veri otomatik toplanıyor mu?
Properties JSON kategoriye uygun mu?
Dışa aktarma bu veriyi destekliyor mu?
```
