SELECT 'reader_exercises' AS table_name, to_regclass('public.reader_exercises') IS NOT NULL AS exists
UNION ALL
SELECT 'reader_exercise_attempts', to_regclass('public.reader_exercise_attempts') IS NOT NULL
UNION ALL
SELECT 'reader_guides', to_regclass('public.reader_guides') IS NOT NULL
UNION ALL
SELECT 'word_reviews', to_regclass('public.word_reviews') IS NOT NULL
UNION ALL
SELECT 'reading_groups', to_regclass('public.reading_groups') IS NOT NULL
UNION ALL
SELECT 'reading_group_members', to_regclass('public.reading_group_members') IS NOT NULL
UNION ALL
SELECT 'reading_group_messages', to_regclass('public.reading_group_messages') IS NOT NULL
ORDER BY table_name;

SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'reader_exercises',
    'reader_exercise_attempts',
    'reader_guides',
    'word_reviews',
    'reading_groups',
    'reading_group_members',
    'reading_group_messages'
  )
ORDER BY tablename, policyname;
