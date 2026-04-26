# 03 — Kullanılabilirlik ve Kolaylık Mimarisi

Bu doküman, uygulamanın kolay anlaşılır, hızlı ve hataya dayanıklı kullanılmasını sağlayan kuralları tanımlar.

## Ana hedef

Kullanıcı uygulamayı ilk açtığında ne yapacağını düşünmeden anlayabilmelidir.

## Kullanıcı tipleri

Uygulama üç kullanıcı tipine göre tasarlanır:

```txt
Yeni kullanıcı
Sık kullanan kullanıcı
Detaylı analiz yapan kullanıcı
```

## Yeni kullanıcı akışı

İlk açılışta kullanıcıya karmaşık ekran gösterilmez.

İlk ekran:

```txt
1. Ne yapmak istiyorsun?
   - Fırsat ara
   - Meclis kararı takip et
   - İlan ekle

2. Hangi kategori?
   - Konut
   - Arsa
   - İşyeri
   - Araç

3. Şehir / ilçe seç

4. Sonuçları gör
```

## Sık kullanan kullanıcı akışı

Sık kullanılan işlemler tek dokunuşta erişilebilir olmalıdır.

Hızlı işlemler:

- Son aramayı tekrar çalıştır
- Favorileri aç
- Yeni ilan ekle
- En iyi fırsatları göster
- Son meclis taramasını aç

## Detaylı analiz kullanıcısı

Bu kullanıcı daha fazla filtre ve karşılaştırma ister.

Gelişmiş araçlar:

- Çoklu karşılaştırma
- Puan açıklaması
- Eksik bilgi analizi
- Bölge bazlı liste
- CSV / JSON dışa aktarma
- Sohbete gönderme

## Tek elle mobil kullanım

Mobilde en çok kullanılan butonlar ekranın alt yarısında olmalıdır.

Alt bölge butonları:

```txt
Ara
Ekle
Favori
Filtre
Sırala
```

Üst bölge sadece bilgi ve başlık için kullanılır.

## Dokunma alanı kuralları

- Ana buton yüksekliği en az 44px olmalı.
- Butonlar arasında en az 8px boşluk olmalı.
- Küçük ikon tek başına tıklanabilir olmamalı; yanında metin veya geniş alan olmalı.
- Kritik butonlar yanlışlıkla basılmayacak yerde olmalı.

## Form kolaylığı

Formlar kısa görünmeli, detaylar açılır olmalıdır.

İlk görünen alanlar:

```txt
Kategori
Şehir
İlçe
Fiyat
```

Gelişmiş filtreler sonradan açılır.

## Akıllı varsayılanlar

Uygulama kullanıcının son seçimlerini hatırlamalıdır.

Hatırlanacak bilgiler:

- Son şehir
- Son ilçe
- Son kategori
- Son sıralama türü
- Son seçilen görünüm modu
- Favori kaynaklar

## Aktif filtre görünürlüğü

Kullanıcı hangi filtrelerin açık olduğunu görmelidir.

Örnek:

```txt
Aktif filtreler: Adana, Seyhan, Arsa, 0-2.000.000 TL
```

Her filtre etiketi tek tek kaldırılabilir.

## Hata önleme

Kullanıcı yanlış veri girerse işlemden önce uyarı verilir.

Örnekler:

- Fiyat negatif olamaz.
- Min fiyat max fiyattan büyük olamaz.
- Link geçerli görünmüyor.
- Telefon numarası eksik veya hatalı.
- Metrekare bilgisi yoksa m2 fiyatı hesaplanamaz.

## Hata mesajı dili

Hata mesajları kısa, net ve çözüm odaklı olmalıdır.

Kötü:

```txt
Invalid input
```

İyi:

```txt
Fiyat alanına yalnızca sayı gir.
```

## Boş ekran kolaylığı

Boş ekranlar kullanıcıyı yönlendirmelidir.

Örnek:

```txt
Henüz ilan yok.
İlk ilanı ekle veya resmî arama linki oluştur.
```

## Geri alma sistemi

Silme ve temizleme işlemlerinde geri alma olmalıdır.

Örnek:

```txt
İlan silindi. Geri al
```

## Onay isteyen işlemler

Şu işlemler onaysız yapılmaz:

- Tüm verileri sil
- Favorileri temizle
- API anahtarını sil
- Geçmişi temizle
- Veritabanını sıfırla

## Arama kolaylığı

Arama alanı her zaman görünür veya kolay erişilebilir olmalıdır.

Arama şunlarda çalışır:

- İlan başlığı
- Konum
- Notlar
- Kaynak
- Özellikler
- Meclis sonucu

## Sıralama kolaylığı

Sıralama seçenekleri anlaşılır isimlerle yazılır.

Kullanılacak isimler:

```txt
En yeni
En ucuz
En pahalı
En iyi fırsat
m2 fiyatı düşük
Risk düşük
```

## Kullanıcıyı yormama ilkesi

Uygulama kullanıcıdan gereksiz veri istemez.

İlk kayıt için zorunlu alanlar:

```txt
Kategori
Başlık
Fiyat
```

Diğer her şey isteğe bağlıdır.

## Klavye uyumu

Mobilde uygun klavye açılmalıdır.

- Fiyat alanı: sayı klavyesi
- Telefon alanı: telefon klavyesi
- Link alanı: URL klavyesi
- Not alanı: normal metin

## Performans algısı

Kullanıcı beklerken uygulamanın donduğunu düşünmemelidir.

Kurallar:

- İşlem başlar başlamaz durum göster.
- 1 saniyeyi aşan işlemde yükleniyor mesajı göster.
- Uzun işlemde aşama göster.
- Başarılı işlemde kısa bildirim göster.

## Kullanılabilirlik kontrol listesi

Her yeni özellikte şu sorular sorulacak:

```txt
Bu işlem mobilde tek elle yapılabiliyor mu?
Kullanıcı ne yapacağını ilk bakışta anlıyor mu?
Hata yaparsa nasıl düzeltecek?
Geri alma var mı?
Buton yeterince büyük mü?
Metinler kısa ve net mi?
Boş durum ekranı var mı?
Yükleniyor durumu var mı?
```
