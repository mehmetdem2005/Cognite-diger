# 15 — PostgreSQL Geçiş Planı

Bu doküman SQLite çalışan sistemi bozmadan PostgreSQL'e profesyonel geçiş için hazırlanmıştır.

## Mevcut durum

Şu an uygulama aktif olarak SQLite kullanır:

```txt
DATABASE_ENGINE=sqlite
DATABASE_PATH=data/app.db
```

Repository katmanı hâlâ sqlite3 bağlantısı kullanır. Bu yüzden PostgreSQL engine değeri şimdilik bilinçli olarak korumalıdır:

```txt
DATABASE_ENGINE=postgres
```

bu aşamada kontrollü hata verir. Sessiz veri bozulması önlenir.

## Hedef durum

Production için hedef:

```txt
DATABASE_ENGINE=postgres
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Eklenen hedef şema

PostgreSQL sözleşme dosyası:

```txt
backend/db/postgres_schema.sql
```

Bu dosya aşağıdaki tabloları hedefler:

```txt
users
auth_sessions
listings
saved_searches
data_sources
source_items
jobs
job_events
scan_history
```

## SQLite ve PostgreSQL farkları

### ID tipi

SQLite:

```txt
INTEGER PRIMARY KEY AUTOINCREMENT
```

PostgreSQL:

```txt
BIGSERIAL veya UUID
```

Kullanıcı tablosunda hedef UUID'dir.

### JSON alanları

SQLite:

```txt
properties_json TEXT
contact_json TEXT
payload_json TEXT
```

PostgreSQL:

```txt
properties JSONB
contact JSONB
payload JSONB
```

### Boolean alanları

SQLite:

```txt
0 / 1 INTEGER
```

PostgreSQL:

```txt
BOOLEAN
```

### Timestamp

SQLite:

```txt
TEXT DEFAULT CURRENT_TIMESTAMP
```

PostgreSQL:

```txt
TIMESTAMPTZ DEFAULT NOW()
```

## Geçiş fazları

### Faz A — Config ve şema hazırlığı

Tamamlananlar:

```txt
DATABASE_ENGINE eklendi
DATABASE_URL eklendi
PostgreSQL hedef şeması eklendi
SQLite default davranışı korundu
DATABASE_ENGINE=postgres için güvenli fail-fast eklendi
```

### Faz B — DB adapter katmanı

Yapılacak:

```txt
SQLite adapter
PostgreSQL adapter
Param style soyutlama
Transaction helper
Row decode standardı
```

SQLite parametreleri:

```txt
?
```

PostgreSQL parametreleri:

```txt
%s veya $1 tarzı adapter'a göre değişir
```

Bu nedenle repository sorguları doğrudan engine'e bağımlı kalmamalı.

### Faz C — Repository portu

Yapılacak repository'ler:

```txt
repositories/auth.py
repositories/listings.py
repositories/saved_searches.py
repositories/data_sources.py
repositories/jobs.py
```

Her repository için PostgreSQL uyumlu test yazılacak.

### Faz D — Migration runner

Yapılacak:

```txt
backend/db/migration_runner.py
migrations/sqlite/*.sql
migrations/postgres/*.sql
schema version tablosu
```

Başlangıçta mevcut Python migration korunabilir; PostgreSQL için SQL migration tercih edilir.

### Faz E — Veri taşıma

SQLite dump mantığı:

```txt
users -> users
auth_sessions -> auth_sessions
listings.properties_json -> listings.properties JSONB
listings.contact_json -> listings.contact JSONB
listings.score_reasons_json -> listings.score_reasons JSONB
saved_searches.filters_json -> saved_searches.filters JSONB
data_sources.config_json -> data_sources.config JSONB
jobs.payload_json -> jobs.payload JSONB
jobs.result_json -> jobs.result JSONB
job_events.data_json -> job_events.data JSONB
scan_history.payload_json -> scan_history.payload JSONB
```

### Faz F — Production geçiş checklist

```txt
PostgreSQL instance oluştur
DATABASE_ENGINE=postgres ayarla
DATABASE_URL secret olarak gir
postgres_schema.sql çalıştır
Smoke test: /api/ready
Auth testleri
Listing CRUD testleri
Source sync testleri
Job testleri
Backup stratejisi
```

## Riskler

```txt
JSON TEXT -> JSONB dönüşümünde bozuk JSON varsa hata olur
SQLite boolean integer değerleri PostgreSQL boolean'a map edilmeli
Mevcut local user UUID olmadığı için özel migration gerekir
Foreign key ilişkileri sıkılaşacağı için önce users taşınmalı
```

## Local user stratejisi

SQLite'ta eski kayıtlar için `user_id='local'` var.

PostgreSQL'de UUID hedeflendiği için local user için sabit UUID kullanılacak:

```txt
00000000-0000-0000-0000-000000000000
```

Migration sırasında:

```txt
local -> 00000000-0000-0000-0000-000000000000
```

## Şu an uygulanmayacaklar

Bu aşamada yapılmayacaklar:

```txt
Canlı PostgreSQL bağlantısı
Repository'leri psycopg'a geçirmek
SQLite verisini otomatik PostgreSQL'e taşımak
```

Sebep: Önce adapter katmanı ve testler yazılmalı.

## Sonraki teknik adım

```txt
DB adapter interface tasarla
SQLite adapter'ı mevcut davranışla bağla
PostgreSQL adapter skeleton ekle
Repository'leri adapter üzerinden konuştur
```
