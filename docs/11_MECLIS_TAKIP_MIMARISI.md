# 11 — Meclis Takip Mimarisi

Bu doküman belediye kararlarını takip eden modülün veri akışını, PDF işleme yapısını, anahtar kelime taramasını ve raporlama kurallarını tanımlar.

## Ana hedef

Kullanıcı belirlediği belediye ve anahtar kelimeler için meclis kararlarını düzenli takip edebilmelidir.

## Ana akış

```txt
Belediye seç
Karar sayfasını belirle
Anahtar kelimeleri gir
PDF/metinleri tara
Sonuçları göster
Geçmişe kaydet
Sohbete gönder
Rapor indir
```

## Belediye kaynak türleri

Belediye kararları farklı şekillerde yayınlanabilir.

Kaynak türleri:

```txt
PDF listesi
HTML karar sayfası
Duyuru sayfası
Dosya indirme linkleri
Arama sayfası
```

## Belediye linki bulma

Groq tek başına link bulma kaynağı olarak güvenilir değildir. Bu yüzden üçlü strateji kullanılmalıdır.

```txt
1. Kullanıcının manuel link girmesi
2. Arama motoru / resmi site araması
3. Groq ile link adaylarını yorumlama
```

Groq görevi:

```txt
Link adaylarını değerlendirmek
Resmî belediye sitesi mi diye yorumlamak
Karar sayfası olma ihtimalini açıklamak
```

Groq görevi olmayan şey:

```txt
Kesin gerçek link garantisi vermek
```

## PDF indirme

Backend PDF indirir. Frontend CORS sorunlarıyla uğraşmaz.

PDF akışı:

```txt
URL al
Dosya türünü kontrol et
PDF indir
Boyut sınırını kontrol et
Metin çıkar
Gerekirse OCR yap
Sonucu tarayıcıya döndür
```

## PDF güvenlik sınırları

```txt
Maksimum dosya boyutu sınırı
Timeout sınırı
Bilinmeyen dosya tipi reddi
Çok fazla yönlendirme engeli
Zararlı içerik kontrolü
```

## Metin çıkarma

Önce normal PDF text extraction denenir.

Başarısızsa:

```txt
OCR kuyruğuna gönder
```

İlk sürümde OCR opsiyonel olabilir. PDF metni çıkmıyorsa kullanıcıya açık mesaj verilir.

## OCR politikası

OCR pahalı ve yavaş olabilir.

Kurallar:

- Her PDF için otomatik OCR zorunlu değildir.
- Kullanıcı OCR başlatabilir.
- Büyük PDF'lerde uyarı verilir.
- OCR sonucu kesin kabul edilmez; hata olabilir.

## Anahtar kelime sistemi

Anahtar kelimeler gruplara ayrılabilir.

Örnek gruplar:

```txt
İmar
Ada / parsel
Mahalle
Kişi adı
Şirket adı
Ruhsat
Kamulaştırma
Plan değişikliği
```

## Tarama yöntemleri

İki tarama yöntemi olur:

```txt
Yerel regex / metin arama
Groq destekli anlam analizi
```

### Yerel tarama

Avantaj:

- Hızlı
- Ucuz
- Deterministik

Kullanım:

```txt
Tam kelime arama
Büyük/küçük harf duyarsız arama
Türkçe karakter toleransı
Regex desteği
```

### Groq destekli analiz

Kullanım:

```txt
Kararın özetini çıkarma
Anahtar kelimenin bağlamını yorumlama
Kullanıcıya sade açıklama üretme
```

Groq tüm metne sınırsız gönderilmez. Önce yerel tarama ile ilgili parça çıkarılır.

## Sonuç formatı

Her sonuç şu bilgileri taşır:

```txt
belediye adı
belge adı
belge URL
karar tarihi
bulunan anahtar kelimeler
bağlam metni
sayfa numarası
skor
özet
```

## Bağlam çıkarma

Anahtar kelimenin geçtiği yerin etrafından metin alınır.

Örnek:

```txt
Önceki 300 karakter + eşleşme + sonraki 300 karakter
```

## Raporlama

Desteklenecek rapor türleri:

```txt
HTML rapor
JSON dışa aktarma
Kopyalanabilir özet
E-posta metni
```

## Geçmiş kaydı

Her tarama geçmişe kaydedilir.

Kayıt alanları:

```txt
tarih
belediye
kaynak URL
anahtar kelimeler
bulunan sonuç sayısı
sonuç JSON
```

## Otomatik takip

PWA arka plan görevi güvenilir olmadığı için otomatik takip backend scheduler ile yapılır.

Scheduler işleri:

```txt
Günlük kontrol
Haftalık kontrol
Yeni PDF var mı kontrolü
Yeni eşleşme var mı kontrolü
```

## Bildirim

İlk sürümde bildirim zorunlu değildir.

Sonraki faz:

```txt
Uygulama içi bildirim
E-posta bildirimi
Push bildirimi
```

## Meclis Takip ekranları

```txt
Belediye seçimi
Anahtar kelimeler
Tarama başlat
Sonuçlar
Geçmiş
Rapor
```

## Hata durumları

Olası hatalar:

```txt
Link açılmadı
PDF indirilemedi
PDF metni çıkarılamadı
OCR başarısız oldu
Anahtar kelime bulunamadı
Groq analizi başarısız oldu
```

Her hata kullanıcıya çözümle gösterilir.

Örnek:

```txt
PDF metni çıkarılamadı. Bu dosya taranmış görsel olabilir. OCR ile tekrar deneyebilirsin.
```

## Geliştirme sırası

```txt
1. Manuel PDF yükleme
2. PDF metin çıkarma
3. Anahtar kelime tarama
4. Sonuç kartları
5. Geçmiş kaydı
6. Belediye link kaydı
7. URL'den PDF indirme
8. OCR
9. Groq özetleme
10. Scheduler
```

## Kontrol listesi

```txt
PDF gerçekten indiriliyor mu?
Metin çıkarma başarısızsa açıklama var mı?
Anahtar kelime sonucu bağlamla gösteriliyor mu?
Groq'a tüm veri gereksiz gönderiliyor mu?
Geçmiş kaydı tutuluyor mu?
Kullanıcı rapor alabiliyor mu?
```
