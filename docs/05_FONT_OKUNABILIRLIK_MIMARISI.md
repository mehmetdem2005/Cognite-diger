# 05 — Font ve Okunabilirlik Mimarisi

Bu doküman uygulamanın yazı tipi, metin boyutu, satır aralığı, kontrast ve okunabilirlik kurallarını tanımlar.

## Ana hedef

Uygulama telefonda, güneş altında, küçük ekranda ve uzun listelerde rahat okunmalıdır.

## Font ailesi

İlk sürümde sistem fontları kullanılacaktır. Bu performans için daha güvenlidir.

Önerilen font stack:

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
```

Neden sistem fontu?

- Daha hızlı yüklenir.
- Mobilde daha stabil görünür.
- Ek font dosyası indirmez.
- Türkçe karakter sorunu çıkarma ihtimali düşüktür.

## Türkçe karakter politikası

Tüm dosyalar UTF-8 olarak kaydedilir.

Zorunlu HTML ayarı:

```html
<meta charset="utf-8" />
```

Kurallar:

- Türkçe karakterler kaçış dizisiyle değil doğrudan UTF-8 yazılır.
- Editör UTF-8 olarak ayarlanır.
- Dosya kaydında ANSI veya farklı kodlama kullanılmaz.

## Font boyutu sistemi

```txt
xs:   12px — Yardımcı açıklama
sm:   14px — Küçük metin
base: 16px — Ana metin
lg:   18px — Kart başlığı
xl:   22px — Bölüm başlığı
2xl:  26px — Sayfa başlığı
3xl:  32px — Ana dashboard başlığı
```

## Mobil font kuralları

Mobilde ana metin 14px altına düşmemelidir.

Öneri:

```txt
Ana metin: 15-16px
Kart başlığı: 16-18px
Fiyat: 20-24px
Fırsat puanı: 13-14px
Yardımcı metin: 12-13px
```

## Masaüstü font kuralları

Masaüstünde daha geniş hiyerarşi kullanılabilir.

```txt
Sayfa başlığı: 28-32px
Bölüm başlığı: 22-26px
Kart başlığı: 18px
Normal metin: 16px
```

## Satır yüksekliği

Okunabilirlik için satır yüksekliği önemlidir.

```txt
Başlıklar: 1.2
Normal metin: 1.5
Uzun açıklama: 1.6
Kart içi kısa metin: 1.35
```

## Font ağırlıkları

```txt
400 — Normal metin
500 — Orta vurgu
600 — Form label / küçük başlık
700 — Buton / kart başlığı
800 — Fiyat / önemli skor
900 — Büyük fiyat vurgusu
```

## Fiyat yazımı

Fiyat en güçlü görsel öğelerden biridir.

Örnek format:

```txt
1.250.000 TL
850.000 TL
12.500.000 TL
```

Kurallar:

- Fiyat büyük ve kalın yazılır.
- Para birimi görünür olmalı.
- Uzun fiyat mobilde satır taşırmamalı.

## Sayı ve ölçü formatı

```txt
120 m²
3+1
5. kat
2018 model
85.000 km
```

## Metin hiyerarşisi

Bir kartta önem sırası:

```txt
1. Fiyat
2. Başlık
3. Konum
4. Temel özellikler
5. Fırsat puanı
6. Not / kaynak
```

## Kontrast kuralları

Metin arka planla yeterli kontrasta sahip olmalıdır.

Kullanım:

```txt
Ana metin: koyu lacivert / siyaha yakın
Yardımcı metin: gri ama okunabilir
Pasif metin: çok açık gri olmamalı
```

## Uzun metin kırpma

Kartlarda uzun başlıklar sınırlanır.

Kurallar:

- Kart başlığı maksimum 2 satır.
- Açıklama maksimum 3 satır.
- Detay sayfasında tam metin gösterilir.

## Etiket metinleri

Rozet ve etiketler kısa olmalı.

İyi:

```txt
Riskli
Yeni
Favori
Eksik bilgi
Çok güçlü
```

Kötü:

```txt
Bu ilan bazı sebeplerden dolayı riskli olabilir
```

## Form label kuralları

Label her zaman görünür olmalıdır. Sadece placeholder yeterli değildir.

İyi:

```txt
Fiyat
[ 1.250.000 ]
```

Kötü:

```txt
[ Fiyat giriniz ]
```

Çünkü kullanıcı yazınca placeholder kaybolur.

## Placeholder dili

Placeholder örnek vermek için kullanılır.

Örnek:

```txt
Örn: Seyhan
Örn: 1.500.000
Örn: 120
```

## Uyarı metinleri

Uyarı metni kısa ve çözüm odaklı olur.

Örnek:

```txt
Metrekare girilmediği için m² fiyatı hesaplanamadı.
```

## Yapay zeka cevap metinleri

Yapay zeka cevapları uzun paragraf yerine bölümlü olmalıdır.

Format:

```txt
Özet
Riskler
Güçlü taraflar
Eksik bilgiler
Sonuç
```

## Erişilebilirlik

- Metin sadece renkle anlam kazanmamalı.
- Riskli alanlarda ikon + metin kullanılmalı.
- Buton metinleri açıklayıcı olmalı.
- Görsellerde alt metin olmalı.

## Okunabilirlik kontrol listesi

```txt
Ana metin 14px altına düşüyor mu?
Fiyat kolay okunuyor mu?
Başlıklar çok uzun mu?
Yardımcı metin çok açık renk mi?
Placeholder label yerine kullanılmış mı?
Türkçe karakterler doğru mu?
Mobilde satır taşması var mı?
```
