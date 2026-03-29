-- app_settings tablosu için eksik GRANT ve policy düzeltmesi
-- Supabase SQL Editor'da çalıştır

-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan değerleri ekle (varsa atla)
INSERT INTO app_settings (key, value, description) VALUES
  ('daily_ai_requests_per_user', '10', 'Kullanıcı başına günlük AI kitap analizi limiti'),
  ('max_books_per_user', '50', 'Kullanıcı başına maksimum kitap sayısı')
ON CONFLICT (key) DO NOTHING;

-- RLS aktif et
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Eksik GRANT izinleri (permission denied hatasının asıl sebebi)
GRANT SELECT ON app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON app_settings TO authenticated;

-- Eski policy'leri temizle (idempotent)
DROP POLICY IF EXISTS "Public read app_settings" ON app_settings;
DROP POLICY IF EXISTS "Super admin write app_settings" ON app_settings;

-- Herkes okuyabilir
CREATE POLICY "Public read app_settings" ON app_settings
  FOR SELECT USING (true);

-- Super admin yazabilir
CREATE POLICY "Super admin write app_settings" ON app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );
-- Fix: Grant table-level permissions to Supabase roles
-- Run this in Supabase SQL Editor → https://supabase.com/dashboard/project/_/sql

GRANT ALL ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
GRANT ALL ON public.books TO anon;

GRANT ALL ON public.reading_sessions TO authenticated;
GRANT ALL ON public.reading_sessions TO service_role;

GRANT ALL ON public.highlights TO authenticated;
GRANT ALL ON public.highlights TO service_role;

GRANT ALL ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

GRANT ALL ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

GRANT ALL ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT ALL ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;

GRANT ALL ON public.story_chapters TO authenticated;
GRANT ALL ON public.story_chapters TO service_role;

GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

GRANT ALL ON public.project_books TO authenticated;
GRANT ALL ON public.project_books TO service_role;

GRANT ALL ON public.ai_provider_config TO service_role;
GRANT SELECT ON public.ai_provider_config TO authenticated;
-- Bozuk requests_used_today değerlerini düzelt
-- (markProviderExhausted 999999 set ediyordu, şimdi daily_limit kullanıyor)
UPDATE ai_provider_config
SET requests_used_today = COALESCE(daily_limit, 1500)
WHERE requests_used_today > COALESCE(daily_limit, 1500);
-- RLS Subquery Güvenlik Düzeltmesi
-- IN (subquery) yerine EXISTS kullan — NULL ile güvenli, daha performanslı
-- Supabase SQL Editor'da çalıştır

-- ─── admins tablosu ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin ekle" ON public.admins;
DROP POLICY IF EXISTS "Admin sil" ON public.admins;
DROP POLICY IF EXISTS "Admin güncelle" ON public.admins;

CREATE POLICY "Admin ekle" ON public.admins FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Admin sil" ON public.admins FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Admin güncelle" ON public.admins FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- ─── catalog_books tablosu ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Katalog ekle" ON public.catalog_books;
DROP POLICY IF EXISTS "Katalog güncelle" ON public.catalog_books;
DROP POLICY IF EXISTS "Katalog sil" ON public.catalog_books;

CREATE POLICY "Katalog ekle" ON public.catalog_books FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Katalog güncelle" ON public.catalog_books FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Katalog sil" ON public.catalog_books FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- ─── admin_messages tablosu ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Mesaj görüntüle" ON public.admin_messages;
DROP POLICY IF EXISTS "Mesaj gönder" ON public.admin_messages;
DROP POLICY IF EXISTS "Mesaj okundu işaretle" ON public.admin_messages;

CREATE POLICY "Mesaj görüntüle" ON public.admin_messages FOR SELECT USING (
  is_broadcast = true
  OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND (id = from_admin_id OR id = to_admin_id))
);
CREATE POLICY "Mesaj gönder" ON public.admin_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND id = from_admin_id)
);
CREATE POLICY "Mesaj okundu işaretle" ON public.admin_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND id = to_admin_id)
);

-- ─── ai_provider_config tablosu ────────────────────────────────────────────

DROP POLICY IF EXISTS "AI provider config sadece super_admin yazabilir" ON public.ai_provider_config;
DROP POLICY IF EXISTS "AI provider config sadece super_admin guncelleyebilir" ON public.ai_provider_config;
DROP POLICY IF EXISTS "AI provider config sadece super_admin silebilir" ON public.ai_provider_config;

CREATE POLICY "AI provider config sadece super_admin yazabilir"
  ON public.ai_provider_config FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "AI provider config sadece super_admin guncelleyebilir"
  ON public.ai_provider_config FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "AI provider config sadece super_admin silebilir"
  ON public.ai_provider_config FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));
