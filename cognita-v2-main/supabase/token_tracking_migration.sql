-- Token Tracking Migration
-- Run this in Supabase SQL Editor to add real token tracking

-- Add new columns
ALTER TABLE public.ai_provider_config
  ADD COLUMN IF NOT EXISTS tokens_used_today bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_daily_limit bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_tokens_used bigint DEFAULT 0;

-- Update default token daily limits per provider (Groq ~500K tokens/day free tier)
UPDATE public.ai_provider_config SET token_daily_limit = 500000 WHERE provider_name = 'groq';
UPDATE public.ai_provider_config SET token_daily_limit = 1000000 WHERE provider_name LIKE 'gemini%';

-- Replace increment function to also track tokens
CREATE OR REPLACE FUNCTION public.increment_provider_usage(
  p_provider_name text,
  p_today date,
  p_tokens_used bigint DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_provider_config
  SET
    requests_used_today = CASE
      WHEN last_reset_date = p_today THEN requests_used_today + 1
      ELSE 1
    END,
    tokens_used_today = CASE
      WHEN last_reset_date = p_today THEN tokens_used_today + p_tokens_used
      ELSE p_tokens_used
    END,
    last_reset_date = p_today,
    total_requests_made = total_requests_made + 1,
    total_tokens_used = total_tokens_used + p_tokens_used,
    updated_at = now()
  WHERE provider_name = p_provider_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
