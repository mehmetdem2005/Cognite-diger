CREATE TABLE IF NOT EXISTS public.admins (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  invited_by uuid REFERENCES public.admins(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin görüntüle" ON public.admins;
CREATE POLICY "Admin görüntüle" ON public.admins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin ekle" ON public.admins;
CREATE POLICY "Admin ekle" ON public.admins
FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

DROP POLICY IF EXISTS "Admin sil" ON public.admins;
CREATE POLICY "Admin sil" ON public.admins
FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings herkese okunur" ON public.app_settings;
CREATE POLICY "app_settings herkese okunur" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_settings sadece super_admin yazabilir" ON public.app_settings;
CREATE POLICY "app_settings sadece super_admin yazabilir" ON public.app_settings
FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

DROP POLICY IF EXISTS "app_settings sadece super_admin guncelleyebilir" ON public.app_settings;
CREATE POLICY "app_settings sadece super_admin guncelleyebilir" ON public.app_settings
FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

INSERT INTO public.app_settings (key, value, description) VALUES
('daily_ai_requests_per_user', '10', 'Kullanıcı başına günlük AI analizi limiti'),
('max_books_per_user', '50', 'Kullanıcı başına maksimum kitap sayısı')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_requests_today int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_requests_reset_date date;

CREATE TABLE IF NOT EXISTS public.ai_provider_config (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  is_enabled boolean DEFAULT false,
  provider_category text NOT NULL CHECK (provider_category IN ('paid', 'free', 'free_limited')),
  daily_limit integer,
  requests_used_today integer DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  tokens_remaining bigint,
  tokens_used_today bigint DEFAULT 0,
  token_daily_limit bigint DEFAULT NULL,
  total_tokens_used bigint DEFAULT 0,
  fallback_threshold integer DEFAULT 0,
  fallback_to text,
  priority integer DEFAULT 999,
  model_name text,
  total_requests_made bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AI provider config herkese okunur" ON public.ai_provider_config;
CREATE POLICY "AI provider config herkese okunur" ON public.ai_provider_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "AI provider config sadece super_admin yazabilir" ON public.ai_provider_config;
CREATE POLICY "AI provider config sadece super_admin yazabilir" ON public.ai_provider_config
FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));
DROP POLICY IF EXISTS "AI provider config sadece super_admin guncelleyebilir" ON public.ai_provider_config;
CREATE POLICY "AI provider config sadece super_admin guncelleyebilir" ON public.ai_provider_config
FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));
DROP POLICY IF EXISTS "AI provider config sadece super_admin silebilir" ON public.ai_provider_config;
CREATE POLICY "AI provider config sadece super_admin silebilir" ON public.ai_provider_config
FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

INSERT INTO public.ai_provider_config
(provider_name, display_name, is_enabled, provider_category, priority, model_name, fallback_threshold, fallback_to, token_daily_limit)
VALUES
('openai', 'ChatGPT (GPT-4o mini)', false, 'paid', 1, 'gpt-4o-mini', 0, NULL, NULL),
('deepseek', 'DeepSeek V3', false, 'paid', 3, 'deepseek-chat', 0, NULL, NULL),
('gemini_paid', 'Gemini 2.0 Flash (Ucretli)', false, 'paid', 2, 'gemini-2.0-flash', 0, NULL, 1000000),
('gemini_free', 'Gemini 2.0 Flash (Ucretsiz)', true, 'free_limited', 4, 'gemini-2.0-flash', 100, 'groq', 1000000),
('groq', 'Groq GPT OSS 120B', true, 'free', 5, 'openai/gpt-oss-120b', 80, NULL, 500000)
ON CONFLICT (provider_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_provider_usage(
  p_provider_name text,
  p_today date,
  p_tokens_used bigint DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_provider_config
  SET
    requests_used_today = CASE WHEN last_reset_date = p_today THEN requests_used_today + 1 ELSE 1 END,
    tokens_used_today = CASE WHEN last_reset_date = p_today THEN tokens_used_today + p_tokens_used ELSE p_tokens_used END,
    last_reset_date = p_today,
    total_requests_made = total_requests_made + 1,
    total_tokens_used = total_tokens_used + p_tokens_used,
    updated_at = now()
  WHERE provider_name = p_provider_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
