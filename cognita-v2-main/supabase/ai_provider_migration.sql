-- AI Provider Config Table
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.ai_provider_config (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  is_enabled boolean DEFAULT false,
  -- 'paid' | 'free' | 'free_limited'
  provider_category text NOT NULL CHECK (provider_category IN ('paid', 'free', 'free_limited')),
  -- For free_limited providers (e.g. Gemini Free: 1500/day)
  daily_limit integer,
  requests_used_today integer DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  -- For paid providers (NULL = no limit set yet)
  tokens_remaining bigint,
  -- Auto-switch: when remaining <= threshold, use fallback_to provider
  fallback_threshold integer DEFAULT 0,
  fallback_to text, -- another provider_name
  -- Lower priority number = tried first
  priority integer DEFAULT 999,
  -- The actual model string to pass to the API
  model_name text,
  -- Cumulative stats
  total_requests_made bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read (to show active provider to users)
DROP POLICY IF EXISTS "AI provider config herkese okunur" ON public.ai_provider_config;
CREATE POLICY "AI provider config herkese okunur"
  ON public.ai_provider_config FOR SELECT USING (true);

-- Only super_admin can insert/update/delete
DROP POLICY IF EXISTS "AI provider config sadece super_admin yazabilir" ON public.ai_provider_config;
CREATE POLICY "AI provider config sadece super_admin yazabilir"
  ON public.ai_provider_config FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

DROP POLICY IF EXISTS "AI provider config sadece super_admin guncelleyebilir" ON public.ai_provider_config;
CREATE POLICY "AI provider config sadece super_admin guncelleyebilir"
  ON public.ai_provider_config FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

DROP POLICY IF EXISTS "AI provider config sadece super_admin silebilir" ON public.ai_provider_config;
CREATE POLICY "AI provider config sadece super_admin silebilir"
  ON public.ai_provider_config FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin'));

-- Default provider configurations
INSERT INTO public.ai_provider_config
  (provider_name, display_name, is_enabled, provider_category, priority, model_name, fallback_threshold, fallback_to)
VALUES
  ('openai',       'ChatGPT (GPT-4o mini)',  false, 'paid',         1, 'gpt-4o-mini',              0,   NULL),
  ('deepseek',     'DeepSeek V3',            false, 'paid',         3, 'deepseek-chat',             0,   NULL),
  ('gemini_paid',  'Gemini 2.0 Flash (Ücretli)', false, 'paid',     2, 'gemini-2.0-flash',          0,   NULL),
  ('gemini_free',  'Gemini 2.0 Flash (Ücretsiz, 1500/gün)', true, 'free_limited', 4, 'gemini-2.0-flash', 100, 'groq'),
  ('groq',         'Groq LLaMA (Ücretsiz)',  true,  'free',         5, 'llama-3.1-8b-instant',     80,   NULL)
ON CONFLICT (provider_name) DO NOTHING;

-- Atomic increment function (bypasses RLS, called server-side with service role)
CREATE OR REPLACE FUNCTION public.increment_provider_usage(
  p_provider_name text,
  p_today date
)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_provider_config
  SET
    requests_used_today = CASE
      WHEN last_reset_date = p_today THEN requests_used_today + 1
      ELSE 1
    END,
    last_reset_date = p_today,
    total_requests_made = total_requests_made + 1,
    updated_at = now()
  WHERE provider_name = p_provider_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
