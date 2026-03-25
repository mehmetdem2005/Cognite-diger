-- App-wide admin-configurable settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('daily_ai_requests_per_user', '10', 'Kullanıcı başına günlük AI kitap analizi limiti'),
  ('max_books_per_user', '50', 'Kullanıcı başına maksimum kitap sayısı')
ON CONFLICT (key) DO NOTHING;

-- RLS: herkes okuyabilir, servis rolü yazabilir
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read app_settings" ON app_settings FOR SELECT USING (true);

-- Per-user daily AI usage tracking (add to existing profiles table)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_requests_today INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_requests_reset_date DATE;
