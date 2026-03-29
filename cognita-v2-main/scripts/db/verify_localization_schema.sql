CREATE TEMP TABLE verify_results (
  item TEXT PRIMARY KEY,
  ok BOOLEAN NOT NULL
);

INSERT INTO verify_results (item, ok)
SELECT 'profiles.native_language', EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'native_language'
)
UNION ALL
SELECT 'profiles.learning_language', EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'learning_language'
)
UNION ALL
SELECT 'profiles.ui_language', EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'ui_language'
)
UNION ALL
SELECT 'profiles.cefr_level', EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'cefr_level'
)
UNION ALL
SELECT 'profiles_cefr_level_check', EXISTS (
  SELECT 1
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND constraint_name = 'profiles_cefr_level_check'
)
UNION ALL
SELECT 'highlights.language', EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'highlights'
    AND column_name = 'language'
)
UNION ALL
SELECT 'vocabulary.source_language', EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'vocabulary'
    AND column_name = 'source_language'
)
UNION ALL
SELECT 'vocabulary.target_language', EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'vocabulary'
    AND column_name = 'target_language'
);

DO $$
BEGIN
  IF to_regclass('public.app_settings') IS NOT NULL THEN
    INSERT INTO verify_results (item, ok)
    SELECT 'app_settings.default_ui_language', EXISTS (
      SELECT 1 FROM public.app_settings WHERE key = 'default_ui_language'
    )
    UNION ALL
    SELECT 'app_settings.supported_ui_languages', EXISTS (
      SELECT 1 FROM public.app_settings WHERE key = 'supported_ui_languages'
    )
    UNION ALL
    SELECT 'app_settings.supported_learning_languages', EXISTS (
      SELECT 1 FROM public.app_settings WHERE key = 'supported_learning_languages'
    )
    UNION ALL
    SELECT 'app_settings.flow_language_filtering_enabled', EXISTS (
      SELECT 1 FROM public.app_settings WHERE key = 'flow_language_filtering_enabled'
    );
  ELSE
    INSERT INTO verify_results (item, ok)
    VALUES
      ('app_settings.default_ui_language', FALSE),
      ('app_settings.supported_ui_languages', FALSE),
      ('app_settings.supported_learning_languages', FALSE),
      ('app_settings.flow_language_filtering_enabled', FALSE);
  END IF;
END $$;

SELECT item, ok
FROM verify_results
ORDER BY item;