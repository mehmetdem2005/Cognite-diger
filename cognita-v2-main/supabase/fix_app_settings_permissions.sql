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
