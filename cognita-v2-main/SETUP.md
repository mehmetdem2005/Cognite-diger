# 🚀 SETUP GUIDE - Environment Variables

## Quick Start (Local Testing)

### ✅ Kurulu olan dosyalar:
- `.env.example` - Template
- `.env.local` - Development config (dummy values ile)

### 🔑 Gerçek Supabase Keys için:

#### 1. Supabase Projesi Oluştur
```
1. https://supabase.com adresine gidHt
2. Sign up with GitHub
3. Create new project (free tier)
4. Proje oluşturulduktan sonra:
   - Project Settings → API
   - Copy URL ve ANON KEY
```

#### 2. Keys'i Env'e Ekle
```bash
# .env.local dosyasını düzen:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### 3. Backend API (Test Mode)
- **Local:** `http://localhost:8000`
- **Production:** `https://cognita-api.onrender.com`

### 🐳 Backend Başlatma (Optional)
```bash
cd backend/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### ✅ Database Schema Oluştur
1. Supabase Dashboard → SQL Editor
2. Copy & paste: `supabase_schema.sql`
3. Run
4. Tekrar: `supabase/extended_schema.sql`
5. Localization profile alanları için: `supabase/localization_migration.sql`

### ✅ Localization Migration (CLI)
Pooler veya Postgres bağlantı URL'in varsa migration'ı terminalden de uygulayabilirsin:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:localization
DATABASE_URL="postgresql://..." npm run db:verify:localization
```

Notlar:
- Script, sırayla `DATABASE_URL`, `SUPABASE_DB_URL`, `POSTGRES_URL` değişkenlerini dener.
- `psql` yoksa `docker` içindeki `postgres:16-alpine` ile çalışır.
- Mevcut bu container'da Supabase pooler bağlantısı genelde direct host yerine daha sorunsuz çalışır.

### 🎉 Frontend Start
```bash
npm run dev
# Port 3000 veya 3001'de çalışacak
```

## Troubleshooting

### "Failed Fetch" Hatası
- ✅ .env.local dosyasının varlığını kontrol et
- ✅ Supabase Keys'in doğru olup olmadığını kontrol et
- ✅ Network sekmesi açık mı? (Chrome DevTools → Network)

### "Cannot find schema" Hatası
- ✅ SQL Schema'ları Supabase'e import et (supabase/ klasöründeki dosyalar)

### API Bağlantı Hatası
- ✅ Backend'i başlat veya prod URL'ini kullan

## 📁 Önemli Dosyalar
- `.env.local` - Hİ COMMIT ETME! (gitignore'da var)
- `.env.example` - Template (commit etme)
- `supabase_schema.sql` - Ana veritabanı şeması
- `supabase/extended_schema.sql` - Yeni features için şema
- `supabase/localization_migration.sql` - Dil tercihleri ve localization alanları
- `scripts/db/apply_localization_migration.sh` - Localization migration uygulama script'i
- `scripts/db/verify_localization_schema.sh` - Localization schema doğrulama script'i
- `backend/render.yaml` - Render deployment config
