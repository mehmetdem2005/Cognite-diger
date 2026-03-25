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
