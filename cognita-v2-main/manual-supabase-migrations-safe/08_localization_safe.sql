ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS native_language TEXT DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS learning_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS ui_language TEXT DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS cefr_level TEXT DEFAULT 'A1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND constraint_name = 'profiles_cefr_level_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_cefr_level_check
      CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.highlights
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'tr';

ALTER TABLE IF EXISTS public.vocabulary
  ADD COLUMN IF NOT EXISTS source_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT 'tr';

INSERT INTO public.app_settings (key, value, description) VALUES
('default_ui_language', 'tr', 'Default UI language for new users'),
('supported_ui_languages', 'tr,en,de,fr,es', 'Comma-separated supported UI languages'),
('supported_learning_languages', 'tr,en,de,fr,es', 'Supported learning languages'),
('flow_language_filtering_enabled', '1', 'Enable language-aware filtering in flow')
ON CONFLICT (key) DO NOTHING;
