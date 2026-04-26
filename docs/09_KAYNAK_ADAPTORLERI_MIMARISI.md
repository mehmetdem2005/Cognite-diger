# 09 — Kaynak Adaptörleri Mimarisi

Bu doküman, sahibinden, arabam, hepsiemlak ve benzeri kaynakların uygulamaya nasıl güvenli ve hukuka uygun bağlanacağını tanımlar.

## Ana karar

Bu projede izinsiz otomatik scraping yoktur.

Kaynak adaptörleri yalnızca şu veri yollarını destekler:

```txt
Resmî API
Yetkili partner feed
Kullanıcı tarafından girilen manuel kayıt
Resmî arama linki oluşturma
Uygulama içi güvenli görüntüleme
```

## Adaptör amacı

Farklı kaynaklardan gelen verileri tek iç formata çevirmek.

Kaynaklar farklı olabilir:

```txt
Sahibinden
Arabam
Hepsiemlak
Emlakjet
Emlak ofisi XML feed'i
Galerici feed'i
Kurumsal bayi API'si
Manuel kullanıcı girişi
```

Ama uygulama içinde hepsi aynı modele dönüşür.

## Ortak adaptör çıktısı

Her adaptör şu formatta veri döndürmelidir:

```json
{
  "source": "sahibinden_official",
  "source_mode": "official_api",
  "category": "konut",
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
    "terms": "official contract",
    "fetched_at": ""
  }
}
```

## source_mode değerleri

İzinli modlar:

```txt
manual_user_input
official_api
partner_feed
search_link
in_app_view
```

Yasak modlar:

```txt
hidden_scraping
captcha_bypass
cors_bypass
bulk_unauthorized_extract
```

Backend yasak modla gelen kaydı reddetmelidir.

## Base adapter sözleşmesi

```python
class SourceAdapter:
    name: str
    legal_mode: str

    async def search(self, filters: dict) -> list[dict]:
        ...

    async def get_detail(self, external_id: str) -> dict | None:
        ...
```

## Manual adapter

Kullanıcının kendi girdiği verileri normalize eder.

Özellikler:

- Zorunlu alan kontrolü yapar.
- Fiyatı sayıya çevirir.
- Kategoriyi doğrular.
- Properties alanını temizler.

Bu adaptör ilk sürümde aktif olacak.

## Search link adapter

Veri çekmez. Sadece resmî site arama linki üretir.

Örnek:

```txt
Kategori: arsa
Şehir: Adana
İlçe: Seyhan
Fiyat: 0-2.000.000
```

Çıktı:

```txt
sahibinden arama linki
hepsiemlak arama linki
arabam arama linki
```

Kurallar:

- Link yeni sekmede veya uygulama içi güvenli görüntüleyicide açılır.
- Sayfa HTML'i otomatik parse edilmez.
- Kullanıcı isterse beğendiği ilanı manuel havuza ekler.

## Official API adapter

Resmî API anlaşması olursa kullanılır.

Gerekli bilgiler:

```txt
API base URL
API key
Rate limit
Kullanım şartları
Hangi alanlar alınabilir?
Hangi alanlar saklanabilir?
Telefon/adres gösterim izni var mı?
```

Bu bilgiler olmadan adaptör aktif edilmez.

## Partner feed adapter

Yetkili XML/JSON feed için kullanılır.

Örnek kaynaklar:

```txt
Emlak ofisi kendi portföy feed'i
Galerici araç feed'i
Kurumsal bayi veri aktarımı
```

Kurallar:

- Feed sahibi izin vermiş olmalıdır.
- Veri kaynağı adı saklanmalıdır.
- Güncelleme zamanı tutulmalıdır.

## In-app view adapter

Bu adaptör veri çekmez. Kullanıcının resmi sayfayı uygulama içinde açmasını sağlar.

PWA'da:

```txt
Yeni sekme
Güvenli harici bağlantı
```

Android wrapper'da:

```txt
WebView
Chrome Custom Tabs
```

Kurallar:

- Kullanıcı resmi site üzerinde kalır.
- Oturum, giriş, favori gibi işlemler resmi sitede olur.
- Uygulama sayfanın içeriğini izinsiz okumaz.

## Telefon ve iletişim bilgileri

Telefon alanı sadece şu durumlarda işlenir:

```txt
Kullanıcı kendisi girdiyse
Resmî API bu alanı açıkça sağlıyorsa
Partner feed sözleşmesi bu alanı kapsıyorsa
```

Aksi halde telefon otomatik toplanmaz.

## Görsel kullanımı

Görsel kaynakları:

```txt
Kullanıcı girişi
Resmî API image_url
Partner feed image_url
```

Hotlink riski varsa görsel proxy sonraki fazda eklenebilir. İlk sürümde görsel URL opsiyoneldir.

## Rate limit politikası

Resmî API olsa bile sınırsız istek yapılmaz.

Kurallar:

- Kaynak bazlı istek limiti tutulur.
- Hata alınırsa tekrar deneme aralığı artar.
- Aynı kayıt tekrar tekrar çekilmez.

## Veri doğrulama

Adaptörden gelen veri kaydedilmeden önce doğrulanır.

Kontroller:

```txt
Fiyat sayı mı?
Kategori geçerli mi?
URL geçerli mi?
Kaynak modu izinli mi?
Telefon işleme izni var mı?
Properties JSON bozuk mu?
```

## Adaptör geliştirme sırası

```txt
1. ManualAdapter
2. SearchLinkAdapter
3. PartnerFeedAdapter iskeleti
4. OfficialApiAdapter iskeleti
5. InAppView stratejisi
6. Kaynak bazlı rate limit
7. Kaynak bazlı hata raporu
```

## Kontrol listesi

```txt
Bu kaynak izinli mi?
Kullanım şartları veri saklamaya izin veriyor mu?
Telefon/adres işlenebilir mi?
Rate limit var mı?
Veri iç formata çevriliyor mu?
Eksik bilgi uyduruluyor mu?
Kaynak modu kayıt ediliyor mu?
```
