# Mimari

## Ana hedef

Uygulama mobil öncelikli, sekmeli ve genişletilebilir olacak. İlk sürüm lokal çalışır; daha sonra PostgreSQL, kullanıcı hesabı, bildirim ve Android/PWA paketleme eklenebilir.

## Katmanlar

```txt
Frontend
  ↓
FastAPI Backend
  ↓
SQLite / PostgreSQL
  ↓
Kaynak Adaptörleri + Puanlama Motoru
```

## Ana sekmeler

- Dashboard
- Fırsat Avcısı
- Veri Kaynakları
- Meclis Takip
- Geçmiş
- Ayarlar

## Fırsat Avcısı alt sekmeleri

- Konut
- Arsa
- İşyeri / Ofis
- Araç
- Favoriler
- Kayıtlı aramalar

## Veri kaynağı stratejisi

1. Resmî API veya partner feed varsa doğrudan adaptör yazılır.
2. Resmî site arama linki uygulama içinde oluşturulur.
3. Kullanıcı beğendiği ilanı havuza ekler.
4. Kelepir puanlama motoru ilanı analiz eder.
5. Groq daha sonra yorumlama/özetleme için eklenir.

## Neden scraping yok?

Çünkü hedef uzun ömürlü, kapanmayan, ban yemeyen ve hukuka uygun bir ürün kurmak. Bu yüzden kaynak katmanı bilerek izinli entegrasyonlara göre tasarlanmıştır.
