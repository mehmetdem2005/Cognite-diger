# 02 — Arayüz Mimarisi

Bu doküman uygulamanın ekran düzenini, bileşen yerleşimini, kart sistemini ve mobil/masaüstü arayüz davranışını tanımlar.

## Ana hedef

Arayüz, telefonda hızlı kullanılacak kadar sade; masaüstünde detaylı analiz yapılacak kadar güçlü olmalıdır.

## Yerleşim modeli

Uygulama üç ana alan üzerinden tasarlanır:

```txt
Üst bar / başlık alanı
Ana içerik alanı
Mobil alt navigasyon veya masaüstü yan menü
```

## Mobil yerleşim

Mobilde ekran dar olduğu için tek kolon tasarım kullanılır.

```txt
[Üst bar]
[Aktif sekme başlığı]
[Filtre / işlem kartı]
[Sonuç kartları]
[Alt navigasyon]
```

Mobil kurallar:

- En önemli işlem ilk ekranda görünür.
- Uzun filtreler katlanabilir panel olur.
- Kartlar tek kolon görünür.
- Butonlar en az 44px yüksekliğinde olur.
- Alt navigasyon başparmakla erişilebilir yerde olur.
- Form alanları tam genişlik kullanır.

## Masaüstü yerleşim

Masaüstünde daha geniş alan kullanılır.

```txt
[Sol sidebar] [Ana içerik] [Detay paneli]
```

Masaüstü kurallar:

- Sol menü sabit kalabilir.
- Sonuç listesi ve detay paneli yan yana gösterilebilir.
- Filtreler sol veya üst panelde olabilir.
- Karşılaştırma ekranı tablo görünümüne geçer.

## Ana ekran yapısı

Dashboard şu kartlardan oluşur:

```txt
Bugünün fırsatları
En yüksek fırsat puanlı ilanlar
Son eklenen ilanlar
Eksik bilgi isteyen ilanlar
Son meclis taramaları
```

## Fırsat Avcısı ekran yapısı

```txt
Kategori alt sekmeleri
Filtre paneli
Sıralama çubuğu
İlan kartları
Detay modalı / detay paneli
```

## Filtre paneli

Filtre paneli mobilde kapalı başlar. Kullanıcı açar.

Bölümler:

```txt
Konum
Fiyat
Temel özellikler
Risk / durum
Kaynak
Sıralama
```

Filtre paneli kuralları:

- Her filtre görünür isimle yazılmalı.
- Min / max alanları yan yana olabilir; mobilde alt alta düşer.
- Uygula ve Temizle butonları panel sonunda sabit olur.
- Aktif filtre sayısı sekme üstünde rozet olarak gösterilir.

## İlan kartı yapısı

İlan kartı üç bölümden oluşur:

```txt
Görsel alanı
Bilgi alanı
Aksiyon alanı
```

Kart içeriği:

- Görsel
- Başlık
- Fiyat
- Konum
- Kategori özellikleri
- Fırsat puanı
- Risk etiketi
- Kaynak
- İlanı aç
- Favoriye ekle
- Karşılaştırmaya ekle
- Not yaz

## Kart yoğunluk seviyeleri

Kullanıcı üç görünüm seçebilir:

```txt
Sade görünüm
Standart görünüm
Detaylı görünüm
```

### Sade görünüm

- Başlık
- Fiyat
- Konum
- Puan

### Standart görünüm

- Görsel
- Başlık
- Fiyat
- Konum
- Temel özellikler
- Puan
- Link

### Detaylı görünüm

- Tüm bilgiler
- Risk açıklaması
- Eksik bilgi uyarısı
- Kullanıcı notu
- Karşılaştırma butonu

## Meclis Takip ekran yapısı

```txt
Belediye seçimi
Anahtar kelime alanı
Tarama yöntemi
Sonuç listesi
Rapor aksiyonları
```

Sonuç kartı:

- Belediye adı
- Belge adı
- Tarih
- Bulunan kelimeler
- Bağlam metni
- Güven skoru
- Rapor indir
- Sohbete gönder

## Sohbet ekran yapısı

Sohbet ekranı normal mesajlaşma gibi görünür.

Alanlar:

```txt
Bağlam seçici
Mesaj listesi
Hızlı soru önerileri
Mesaj yazma alanı
```

Hızlı soru örnekleri:

- Bu ilan neden ucuz olabilir?
- Riskleri ne?
- Bu meclis kararı hangi bölgeyi etkiliyor?
- Hangisi daha mantıklı?

## Detay paneli

Detay paneli mobilde modal, masaüstünde sağ panel olarak açılır.

İçerik:

- Büyük görsel
- Tüm bilgiler
- Puan açıklaması
- Kullanıcı notları
- Aksiyon butonları

## Boş durum ekranları

Her sekmede boş durum özel yazılmalıdır.

Örnek:

```txt
Henüz ilan eklenmedi.
İlk ilanı manuel ekleyebilir veya resmî arama linki oluşturabilirsin.
```

## Hata durumları

Hatalar kullanıcıyı suçlamadan yazılır.

Kötü:

```txt
Hata oluştu.
```

İyi:

```txt
İlan kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene.
```

## Yükleniyor durumları

- Spinner tek başına kullanılmaz.
- Yanında ne yapıldığı yazılır.
- Uzun işlemde adım adım durum gösterilir.

Örnek:

```txt
PDF indiriliyor...
Metin çıkarılıyor...
Anahtar kelimeler aranıyor...
Sonuç hazırlanıyor...
```

## Arayüz altın kuralları

- Her ekranda bir ana amaç olacak.
- En önemli buton görsel olarak en güçlü buton olacak.
- Tehlikeli işlemler kırmızı ve onaylı olacak.
- Kullanıcı aynı işlemi en fazla 2 dokunuşla yapabilmeli.
- Mobilde yatay taşma minimum olacak.
- Kartlar nefes alacak; sıkışık tablo mobilde kullanılmayacak.
