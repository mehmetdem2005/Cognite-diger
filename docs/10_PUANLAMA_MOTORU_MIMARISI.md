# 10 — Kelepir Puanlama Motoru Mimarisi

Bu doküman ilanların nasıl puanlanacağını, fırsat seviyelerinin nasıl hesaplanacağını ve kategoriye göre hangi sinyallerin kullanılacağını tanımlar.

## Ana hedef

Uygulama sadece ilan listelemeyecek. İlanın neden iyi, normal veya riskli olduğunu açıklayacak.

## Önemli uyarı

Puanlama motoru yatırım, hukuk veya satın alma tavsiyesi değildir. Sadece ön eleme ve dikkat noktası üretir.

## Genel puan aralığı

```txt
0-100
```

Etiketler:

```txt
90-100: Çok güçlü fırsat
75-89: İncelenebilir fırsat
60-74: Normal
40-59: Riskli
0-39: Uzak dur
```

## Genel puan formülü

```txt
puan = temel_puan
     + fiyat_avantajı
     + konum_avantajı
     + özellik_avantajı
     + likidite_avantajı
     - risk_cezası
     - eksik_bilgi_cezası
```

Başlangıç temel puanı:

```txt
60
```

## Eksik bilgi cezası

Eksik bilgi varsa puan düşer.

Örnekler:

```txt
Fiyat yok: -40
Konum yok: -10
Metrekare yok: -8
Görsel yok: -3
Link yok: -5
Kategoriye özel kritik alan yok: -5 / -20
```

## Konut puanlama

Konut sinyalleri:

```txt
Fiyat
Metrekare
Metrekare fiyatı
Konum
Oda sayısı
Bina yaşı
Kat
Isıtma
Krediye uygunluk
Site içinde olması
Görsel kalitesi
Eksik bilgi
```

### Konut pozitif sinyaller

```txt
m2 fiyatı bölge ortalamasından düşük
Yeni bina
Krediye uygun
Merkezi konum
Net metrekare yüksek
Acil satış ifadesi
```

### Konut negatif sinyaller

```txt
Çok eski bina
Kat bilgisi yok
Metrekare yok
Fiyat aşırı düşük ama açıklama eksik
Krediye uygun değil
Görsel yok
```

## Arsa puanlama

Arsa sinyalleri:

```txt
Fiyat
Metrekare
m2 fiyatı
İmar durumu
Tapu durumu
Ada/parsel
Yola cephe
Altyapı
Konum gelişim potansiyeli
Hisseli risk
```

### Arsa pozitif sinyaller

```txt
Konut imarlı
Müstakil tapu
Yola cephe
Altyapı var
m2 fiyatı düşük
Gelişen bölge
Ada/parsel bilgisi var
```

### Arsa negatif sinyaller

```txt
Hisseli tapu
İmar belirsiz
Yol yok
Altyapı yok
Ada/parsel yok
Aşırı ucuz ama açıklama eksik
```

### Arsa özel formülü

```txt
arsa_puanı = 60
+ m2_fiyat_avantajı
+ imar_puanı
+ tapu_puanı
+ yol_cephe_puanı
+ altyapı_puanı
- hisseli_risk
- eksik_bilgi
```

## İşyeri / Ofis puanlama

Sinyaller:

```txt
Fiyat
Metrekare
Cadde üzeri
Kira potansiyeli
Kat
Giriş seviyesi
Bina yaşı
Kullanım tipi
Devren / boş
Lokasyon
```

Pozitif:

```txt
Cadde üzeri
Giriş kat
Yüksek yaya trafiği
Düşük m2 fiyatı
Kira çarpanı mantıklı
```

Negatif:

```txt
Bodrum kat
Lokasyon belirsiz
Metrekare yok
Kira potansiyeli belirsiz
Çok eski bina
```

## Araç puanlama

Araç sinyalleri:

```txt
Marka
Model
Yıl
Kilometre
Yakıt
Vites
Hasar kaydı
Boya/değişen
Fiyat
Şehir
Satıcı tipi
```

Pozitif:

```txt
Düşük kilometre
Yeni model yılı
Hasar kaydı yok
Piyasanın altında fiyat
Bakımlı araç ifadesi
Sahibinden satış
```

Negatif:

```txt
Yüksek km
Ağır hasar
Değişen çok
Model yılı eski
Fiyat aşırı düşük ama açıklama eksik
Galeriden şüpheli açıklama
```

### Araç özel formülü

```txt
araç_puanı = 60
+ piyasa_altı_fiyat
+ düşük_km
+ yeni_yıl
+ hasarsızlık
- hasar_riski
- yüksek_km
- eksik_bilgi
```

## Bölge ortalaması problemi

Gerçek bölge ortalaması için güvenilir veri gerekir. İlk sürümde kesin piyasa ortalaması iddiası yapılmaz.

İlk sürüm yaklaşımı:

```txt
Kullanıcının havuzundaki benzer ilanlara göre karşılaştırma
Aynı şehir/ilçe/kategori içinde ortalama hesaplama
Manuel referans fiyat girme
```

Sonraki faz:

```txt
Resmî/izinli veri feed'i varsa gerçek piyasa karşılaştırması
```

## Puan açıklaması

Her puan açıklanabilir olmalıdır.

Örnek:

```txt
Puan: 82
Sebep:
+ m2 fiyatı düşük
+ konum bilgisi var
+ tapu bilgisi var
- görsel yok
- altyapı bilgisi eksik
```

## Groq kullanımı

Groq puanı hesaplayan ana sistem değildir. Puanı açıklamak ve kullanıcıya anlaşılır hale getirmek için kullanılır.

Groq görevleri:

```txt
Riskleri sade anlatma
Eksik bilgileri listeleme
İlanı özetleme
Karşılaştırma metni üretme
```

## Puanlama güvenliği

- Sistem kesin al/sat tavsiyesi vermez.
- Puan tek başına karar sebebi değildir.
- Eksik bilgi varsa puan düşer.
- Çok ucuz ilanlarda risk uyarısı artar.

## Puanlama geliştirme sırası

```txt
1. Basit kategori bazlı puanlama
2. Eksik bilgi cezası
3. Havuz içi karşılaştırma
4. Puan açıklaması
5. Groq açıklama desteği
6. Bölge referans fiyat sistemi
7. Kullanıcı geri bildirimiyle ağırlık ayarı
```

## Kontrol listesi

```txt
Puan açıklanabiliyor mu?
Eksik bilgi cezalandırılıyor mu?
Kategoriye özel sinyaller var mı?
Riskli ilan yüksek puan alıyor mu?
Puan yatırım tavsiyesi gibi sunuluyor mu?
Kullanıcı neden bu puanı gördüğünü anlıyor mu?
```
