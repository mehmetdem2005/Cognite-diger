# 01 — Sekme Mimarisi

Bu doküman, uygulamanın ana sekme düzenini, sekme içi alt kategorileri ve mobil kullanım akışını tanımlar.

## Ana ilke

Uygulama tek ekranda karmaşa yaratmayacak. Her ana iş kendi sekmesinde kalacak. Kullanıcı hangi bölümde olduğunu her zaman görecek.

## Ana sekmeler

```txt
Dashboard
Fırsat Avcısı
Meclis Takip
Harita
Karşılaştırma
Sohbet
Geçmiş
Ayarlar
```

## 1. Dashboard

Amaç: Kullanıcı uygulamayı açınca genel durumu hızlı görür.

İçerik:

- Son eklenen ilanlar
- En yüksek fırsat puanlı kayıtlar
- Son meclis taramaları
- Hızlı işlem butonları
- Veri kaynağı uyarıları
- Günlük özet

Kartlar:

```txt
Bugünün fırsatları
Takip edilen bölgeler
Son meclis kararları
Eksik bilgi isteyen ilanlar
```

## 2. Fırsat Avcısı

Amaç: Konut, arsa, işyeri/ofis ve araç fırsatlarını bulmak, saklamak, puanlamak ve karşılaştırmak.

Alt sekmeler:

```txt
Konut
Arsa
İşyeri / Ofis
Araç
Favoriler
Kayıtlı Aramalar
Veri Kaynakları
```

### Konut alt sekmesi

Filtreler:

- Şehir
- İlçe
- Mahalle
- Satılık / kiralık
- Fiyat aralığı
- Metrekare
- Oda sayısı
- Bina yaşı
- Kat
- Isıtma
- Krediye uygunluk
- Site içinde
- Eşyalı / eşyasız

### Arsa alt sekmesi

Filtreler:

- Şehir
- İlçe
- Mahalle
- İmar durumu
- Metrekare
- Metrekare fiyatı
- Tapu durumu
- Ada / parsel
- Yola cephe
- Altyapı durumu

### İşyeri / Ofis alt sekmesi

Filtreler:

- Dükkan
- Ofis
- Depo
- Plaza
- Cadde üzeri
- Metrekare
- Kat
- Devren / boş
- Kira çarpanı

### Araç alt sekmesi

Filtreler:

- Marka
- Model
- Yıl
- Kilometre
- Yakıt
- Vites
- Hasar kaydı
- Boya / değişen
- Şehir
- Sahibinden / galeri

## 3. Meclis Takip

Amaç: Belediye kararlarını ve PDF belgelerini takip etmek.

Alt bölümler:

```txt
Belediye seçimi
Anahtar kelimeler
PDF / karar tarama
Sonuçlar
Rapor
```

Anahtar kelime tipleri:

- İmar
- Ada / parsel
- Mahalle
- Kişi adı
- Şirket adı
- Ruhsat
- Kamulaştırma
- Plan değişikliği

## 4. Harita

Amaç: İlanları ve meclis kararlarını konuma göre görmek.

Katmanlar:

```txt
İlanlar
Favoriler
Meclis karar bölgeleri
Takip edilen mahalleler
Riskli / yüksek fırsatlı bölgeler
```

İlk sürümde harita zorunlu değildir. Sonraki fazda eklenir.

## 5. Karşılaştırma

Amaç: Kullanıcı iki veya daha fazla ilanı yan yana karşılaştırır.

Karşılaştırma alanları:

- Fiyat
- Metrekare fiyatı
- Konum
- Fırsat puanı
- Risk puanı
- Eksik bilgi
- Notlar
- Görsel
- Link

## 6. Sohbet

Amaç: Kullanıcı seçilen ilan, meclis kararı veya arama sonucu hakkında yapay zekaya soru sorar.

Sohbet bağlamları:

```txt
Seçili ilan
Seçili meclis kararı
Tüm fırsat listesi
Karşılaştırma tablosu
Kayıtlı arama sonucu
```

## 7. Geçmiş

Amaç: Tüm işlem kayıtları saklanır.

Alt sekmeler:

```txt
İlan geçmişi
Meclis tarama geçmişi
Arama geçmişi
Sohbet geçmişi
Dışa aktarılan raporlar
```

## 8. Ayarlar

Alt bölümler:

```txt
Genel
Groq API
Veri kaynakları
Bildirimler
Tema
Yedekleme
Gizlilik
```

## Mobil sekme davranışı

Mobilde ana sekmeler altta sabit navigasyon olarak gösterilir.

Öncelikli 5 mobil sekme:

```txt
Dashboard
Fırsat
Meclis
Sohbet
Ayarlar
```

Diğer sekmeler `Daha Fazla` menüsüne girer.

## Masaüstü sekme davranışı

Masaüstünde sol sidebar kullanılabilir.

Sol sidebar düzeni:

```txt
Logo
Ana sekmeler
Kayıtlı aramalar
Son kullanılanlar
Ayarlar
```

## Sekme kuralı

- Her sekmenin tek ana görevi olacak.
- Bir sekmede üçten fazla ana işlem varsa alt sekmeye bölünecek.
- Mobilde yatay kaydırmalı alt sekme kullanılacak.
- Aktif sekme rengi her zaman belirgin olacak.
- Kullanıcı geri döndüğünde son kaldığı alt sekme korunacak.
