# 12 — Geliştirme Yol Haritası

Bu doküman projenin hangi sırayla geliştirileceğini, her fazda neyin tamamlanmış sayılacağını ve ilerleme kurallarını tanımlar.

## Ana ilke

Önce sağlam temel, sonra özellik.

Kod yazarken şu sıra korunur:

```txt
Mimari
Veri modeli
Backend sözleşmesi
Basit çalışan arayüz
Özellik geliştirme
Test
İyileştirme
```

## Faz 0 — Repo temizliği ve mimari

Durum: Tamamlandı.

Çıktılar:

```txt
README.md
backend iskeleti
frontend iskeleti
docs mimari dosyaları
hukuki veri politikası
```

Tamamlanma şartı:

```txt
Repo eski projeden bağımsız hale gelmiş olacak.
Proje amacı README'de açık olacak.
Ana mimari dokümanları docs altında olacak.
```

## Faz 1 — Temel çalışan uygulama

Amaç: Lokal çalışan ilk sürüm.

İşler:

```txt
FastAPI açılıyor
Frontend servis ediliyor
SQLite oluşuyor
Manuel ilan ekleniyor
İlan listeleniyor
Fırsat puanı hesaplanıyor
Resmî arama linki oluşturuluyor
```

Tamamlanma şartı:

```txt
python run.py çalışınca uygulama açılmalı.
Kullanıcı ilan ekleyip görebilmeli.
```

## Faz 2 — Fırsat Avcısı güçlendirme

Amaç: İlan havuzu kullanılabilir hale gelsin.

İşler:

```txt
Liste filtreleme
Kategoriye özel form alanları
Favoriler
Not sistemi
Karşılaştırmaya ekle
Detay paneli
Aktif filtre rozetleri
```

Tamamlanma şartı:

```txt
Kullanıcı konut/arsa/işyeri/araç kayıtlarını ayrı ayrı yönetebilmeli.
```

## Faz 3 — Puanlama motoru v2

Amaç: Puanlama açıklanabilir hale gelsin.

İşler:

```txt
Kategori bazlı ayrı puan fonksiyonları
Eksik bilgi analizi
Puan açıklama listesi
Risk etiketi
Havuz içi kıyaslama
```

Tamamlanma şartı:

```txt
Her ilanın puanı neden aldığı açıklanabilmeli.
```

## Faz 4 — Meclis Takip temel sürüm

Amaç: Manuel PDF veya metin üzerinden anahtar kelime taraması.

İşler:

```txt
Manuel PDF yükleme
PDF metin çıkarma
Anahtar kelime arama
Bağlam çıkarma
Sonuç kartı
Geçmiş kaydı
HTML rapor
```

Tamamlanma şartı:

```txt
Kullanıcı PDF yükleyip kelime sonucu görebilmeli.
```

## Faz 5 — Belediye URL ve otomasyon

Amaç: Belediye karar sayfalarından düzenli kontrol.

İşler:

```txt
Belediye URL kaydı
PDF link adaylarını bulma
Yeni PDF kontrolü
Scheduler
Tarama geçmişi
Bildirim iskeleti
```

Tamamlanma şartı:

```txt
Kullanıcı bir belediye için kayıtlı takip oluşturabilmeli.
```

## Faz 6 — Groq analiz ve sohbet

Amaç: Sonuçlar üzerinde akıllı açıklama.

İşler:

```txt
Groq API ayarı
İlan analizi
Meclis kararı özeti
Risk açıklaması
Sohbet ekranı
Bağlam seçici
```

Tamamlanma şartı:

```txt
Kullanıcı seçili ilan veya meclis sonucu hakkında soru sorabilmeli.
```

## Faz 7 — Kaynak adaptörleri

Amaç: İzinli kaynak entegrasyonlarına hazır yapı.

İşler:

```txt
ManualAdapter
SearchLinkAdapter
PartnerFeedAdapter iskeleti
OfficialApiAdapter iskeleti
Kaynak izin modu kontrolü
Rate limit sistemi
```

Tamamlanma şartı:

```txt
Yeni izinli kaynak tek adaptörle eklenebilmeli.
```

## Faz 8 — PWA ve mobil paketleme

Amaç: Uygulama telefonda uygulama gibi çalışsın.

İşler:

```txt
manifest.json
service-worker.js
offline shell
mobil alt navigasyon
PWA kurulum mesajı
Android wrapper araştırması
```

Tamamlanma şartı:

```txt
Uygulama ana ekrana eklenebilir olmalı.
```

## Faz 9 — Export, import ve yedekleme

Amaç: Kullanıcı verisini kaybetmesin.

İşler:

```txt
JSON dışa aktarma
JSON içe aktarma
CSV export
HTML rapor export
Veri sıfırlama onayı
```

Tamamlanma şartı:

```txt
Kullanıcı verisini yedekleyip geri yükleyebilmeli.
```

## Faz 10 — Deploy hazırlığı

Amaç: Lokal uygulamadan yayınlanabilir sisteme geçiş.

İşler:

```txt
.env yapısı
CORS kısıtlama
Dockerfile
PostgreSQL uyumluluğu
Render/Railway/VPS deploy notları
Loglama
```

Tamamlanma şartı:

```txt
Uygulama sunucuya kurulabilir hale gelmeli.
```

## Kodlama kuralları

- Her özellik küçük parça halinde eklenecek.
- Önce backend sözleşmesi, sonra frontend bağlama.
- Her yeni endpoint dokümana uygun olacak.
- Hukuki veri politikasına aykırı özellik eklenmeyecek.
- Türkçe karakterler UTF-8 kalacak.
- Mobil görünüm bozulmadan geliştirilecek.

## Öncelik sırası

En önce yapılacaklar:

```txt
1. Listings CRUD eksiklerini tamamla
2. Kategoriye özel form alanlarını düzelt
3. Puanlama açıklamasını ekle
4. Saved searches tablosunu ekle
5. Filtreleme ve favorileri ekle
6. Meclis manuel PDF taramayı ekle
```

## Tamamlandı tanımı

Bir iş şu şartlar sağlanmadan tamamlandı sayılmaz:

```txt
Kod çalışıyor
Mobilde ekran bozulmuyor
Hata mesajı var
Boş durum var
Docs ile çelişmiyor
Veri politikasıyla uyumlu
```

## Günlük çalışma prosedürü

```txt
1. Önce ilgili docs dosyasını oku
2. Kod değişikliğini küçük tut
3. Lokal çalıştır
4. Mobil ekranı kontrol et
5. Hata/boş/yükleniyor durumunu ekle
6. Commit mesajını net yaz
```

## Sonraki gerçek kod adımı

Bir sonraki kod adımı şudur:

```txt
Fırsat Avcısı CRUD + filtre + favori + puan açıklaması
```

Bundan sonra Meclis Takip manuel PDF tarama fazına geçilir.
