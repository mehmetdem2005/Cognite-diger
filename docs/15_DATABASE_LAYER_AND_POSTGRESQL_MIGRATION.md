# 15 — Veritabanı Katmanı ve PostgreSQL Geçiş Planı

Bu doküman, SQLite ile başlayan mevcut veritabanı katmanının profesyonel biçimde büyütülmesi ve ileride PostgreSQL'e taşınması için planı tanımlar.

## Mevcut karar

Şu an veritabanı SQLite'tır. Bunun nedeni hızlı geliştirme, kolay lokal kurulum ve düşük operasyon yüküdür.

Ancak kod artık doğrudan tek bir `database.py` dosyasına yığılmayacaktır.

## Yeni katmanlar

```txt
backend/db/connection.py      SQLite bağlantısı
backend/db/migrations.py      Tablo ve index oluşturma
backend/repositories/         CRUD ve sorgu katmanı
backend/database.py           Geriye uyumlu facade
```

## Neden facade var?

Eski kodlar hâlâ şunu import edebilir:

```python
from backend.database import add_listing
```

Ama gerçek iş artık repository katmanına taşınmıştır. Böylece eski kod kırılmaz, yeni kod ise daha düzenli ilerler.

## Repository prensibi

Her tablo veya iş alanı ayrı repository dosyasına ayrılır:

```txt
repositories/listings.py
repositories/saved_searches.py
repositories/data_sources.py
repositories/decoders.py
```

Yeni tablo eklenecekse doğrudan `database.py` içine yazılmaz. Yeni repository dosyası açılır.

## Migration prensibi

SQLite migration şu an `backend/db/migrations.py` içinde idempotent şekilde çalışır.

Yani uygulama her açıldığında:

```txt
Eksik tablo varsa oluşturur
Eksik kolon varsa ekler
Eksik index varsa oluşturur
```

## PostgreSQL'e geçiş için yapılacaklar

### Faz 1 — Şema ayrımı

SQLite şeması ve PostgreSQL şeması ayrı dosyalara alınacak:

```txt
backend/db/sqlite_schema.py
backend/db/postgres_schema.sql
```

### Faz 2 — Database URL

Ortam değişkeni eklenecek:

```txt
DATABASE_URL=sqlite:///data/app.db
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Faz 3 — Sürücü soyutlama

Repository katmanı korunacak, alt bağlantı katmanı değişecek.

Opsiyonlar:

```txt
SQLAlchemy Core
SQLModel
asyncpg + manuel SQL
```

Bu proje için ilk öneri: SQLAlchemy Core.

Neden?

```txt
FastAPI ile uyumlu
SQLite ve PostgreSQL arasında geçiş kolay
ORM karmaşıklığına girmeden SQL kontrolü sağlar
Migration için Alembic ile uyumlu
```

### Faz 4 — Alembic

Production geçişte migration sistemi Alembic'e taşınacak.

```txt
alembic revision
alembic upgrade head
```

### Faz 5 — Kullanıcı izolasyonu

PostgreSQL geçişinden önce veya geçiş sırasında şu kolonlar eklenecek:

```txt
user_id
organization_id
created_by
```

Böylece çok kullanıcılı sistemin temeli atılır.

## Dikkat edilecek veri tipleri

SQLite ile PostgreSQL farkları:

```txt
INTEGER PRIMARY KEY AUTOINCREMENT -> BIGSERIAL / GENERATED AS IDENTITY
TEXT timestamp -> TIMESTAMPTZ
JSON text kolonları -> JSONB
BOOLEAN integer -> BOOLEAN
```

## İleri hedef şema

İleri hedefte şu tablolar gerekir:

```txt
users
organizations
memberships
listings
saved_searches
data_sources
source_items
jobs
job_events
scan_history
notifications
```

## Kural

Bu projede bundan sonra yeni veri işlemi yazılırken doğrudan endpoint içine SQL yazılmayacak. Akış şöyle olacak:

```txt
API endpoint
    ↓
Service layer
    ↓
Repository layer
    ↓
DB connection / migration layer
```

## Çıkış kriteri

Bu fazın başarılı sayılması için:

```txt
database.py küçülür
repository testleri geçer
migration tek yerde kalır
yeni tablolar için standart yol oluşur
PostgreSQL geçiş planı belgelenir
```
