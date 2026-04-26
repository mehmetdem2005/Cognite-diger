# 04 — Tuş, Renk ve Dizayn Mimarisi

Bu doküman uygulamanın buton sistemini, renk kullanımını, görsel hiyerarşisini ve temel tasarım dilini tanımlar.

## Tasarım hedefi

Uygulama ciddi, güven veren, hızlı ve mobilde okunabilir görünmelidir. Fazla renkli oyun arayüzü gibi değil; finans, emlak ve resmi belge takip uygulaması gibi profesyonel olmalıdır.

## Ana tasarım karakteri

```txt
Temiz
Güvenilir
Mobil öncelikli
Kart tabanlı
Yüksek kontrastlı
Sade ama güçlü
```

## Renk rolleri

Renkler rastgele kullanılmaz. Her rengin görevi vardır.

```txt
Ana renk: Birincil işlem ve aktif sekme
İkincil renk: Yardımcı butonlar
Başarı rengi: Olumlu işlem / güçlü fırsat
Uyarı rengi: Eksik bilgi / dikkat
Tehlike rengi: Silme / risk / kritik hata
Nötr renkler: Arka plan, kart, metin, sınır
```

## Önerilen renk paleti

```txt
Ana koyu:       #0F172A
Ana vurgu:      #0F766E
Vurgu koyu:     #134E4A
Başarı:         #16A34A
Uyarı:          #D97706
Tehlike:        #DC2626
Bilgi:          #2563EB
Arka plan:      #F3F6FB
Kart:           #FFFFFF
Metin:          #0F172A
İkincil metin:  #64748B
Sınır:          #DBE3EF
```

## Renk kullanım kuralları

- Ana işlem butonu yeşil/teal tonunda olur.
- Silme ve tehlikeli işlemler kırmızı olur.
- Uyarılar turuncu olur.
- Bilgi bağlantıları mavi olur.
- Kart arka planı beyaz kalır.
- Arka plan hafif gri-mavi olur.
- Aynı ekranda çok fazla canlı renk kullanılmaz.

## Fırsat puanı renkleri

```txt
90-100: Yeşil — Çok güçlü fırsat
75-89:  Açık yeşil — İncelenebilir fırsat
60-74:  Mavi/Gri — Normal
40-59:  Turuncu — Riskli
0-39:   Kırmızı — Uzak dur
```

## Buton tipleri

### Primary Button

Ana işlem için kullanılır.

Örnekler:

```txt
Ara
Kaydet
İlanı ekle
Taramayı başlat
```

Stil:

```txt
Arka plan: Ana vurgu
Metin: Beyaz
Yükseklik: 44-48px
Border radius: 12px
Font weight: 700
```

### Secondary Button

Yan işlem için kullanılır.

Örnekler:

```txt
Filtrele
Sırala
Detay
Rapor indir
```

Stil:

```txt
Arka plan: Beyaz
Border: Sınır rengi
Metin: Ana metin
```

### Ghost Button

Düşük öncelikli işlem için kullanılır.

Örnekler:

```txt
Vazgeç
Kapat
Daha sonra
```

### Danger Button

Silme, sıfırlama gibi işlemler için kullanılır.

Örnekler:

```txt
Tüm verileri sil
İlanı sil
Geçmişi temizle
```

Kurallar:

- Kırmızı olmalı.
- Onay modalı olmadan çalışmamalı.
- Mobilde yanlışlıkla basılmayacak yerde olmalı.

## Buton boyutları

```txt
Küçük:   36px yükseklik
Normal:  44px yükseklik
Büyük:   52px yükseklik
```

Mobilde ana buton en az 44px olmalı.

## Buton metni kuralları

İyi buton metinleri:

```txt
İlanı ekle
Fırsatları göster
Taramayı başlat
Filtreleri temizle
Rapor indir
```

Kötü buton metinleri:

```txt
OK
Submit
Click
Process
```

## Kart tasarımı

Kartlar uygulamanın ana görsel birimidir.

Kart özellikleri:

```txt
Arka plan: Beyaz
Border: Hafif gri
Radius: 16-20px
Padding: 14-18px
Gölge: Hafif
```

## İlan kartı görsel oranı

```txt
Mobil: 16:9 veya 4:3
Masaüstü: 4:3
Detay modalı: Büyük ve kırpmasız görünüm
```

Görsel yoksa boş gri alan yerine anlamlı placeholder kullanılır.

## Tipografi hiyerarşisi

```txt
Sayfa başlığı: 26-32px
Sekme başlığı: 22-26px
Kart başlığı: 16-18px
Normal metin: 14-16px
Yardımcı metin: 12-14px
Rozet metni: 11-13px
```

## Boşluk sistemi

Boşluklar tutarlı olmalıdır.

```txt
4px  — Çok küçük aralık
8px  — Yakın öğeler
12px — Form ve buton arası
16px — Kart içi boşluk
24px — Bölüm arası
32px — Ana blok arası
```

## Border radius sistemi

```txt
Küçük: 8px
Normal: 12px
Kart: 16px
Büyük panel: 20-24px
Pill/rozet: 999px
```

## Rozet sistemi

Rozetler kısa bilgi vermek için kullanılır.

Örnekler:

```txt
Çok güçlü fırsat
Riskli
Eksik bilgi
Yeni
Favori
Resmî kaynak
Manuel kayıt
```

## İkon kullanımı

İkonlar yardımcıdır, metnin yerine geçmez.

Kurallar:

- Mobilde sadece ikonlu belirsiz buton kullanılmaz.
- Kritik işlemde ikon + metin kullanılır.
- Aynı anlam için aynı ikon kullanılır.

## Tema mimarisi

İlk sürüm açık tema ile başlar.

Sonraki faz:

```txt
Açık tema
Koyu tema
Sistem temasına uyum
```

## Koyu tema kuralları

Koyu tema eklendiğinde:

- Arka plan tam siyah değil koyu lacivert olmalı.
- Kartlar arka plandan ayrılmalı.
- Teal vurgu korunmalı.
- Kırmızı/yeşil tonları göz yormayacak şekilde ayarlanmalı.

## Tasarım kontrol listesi

Her ekran için şu kontrol yapılır:

```txt
Ana işlem butonu belli mi?
Tehlikeli işlem kırmızı mı?
Renkler anlamına uygun mu?
Kartlar yeterince boşluklu mu?
Mobilde butonlar büyük mü?
Metin kontrastı yeterli mi?
Aktif sekme belirgin mi?
Fırsat puanı rengi doğru mu?
```
