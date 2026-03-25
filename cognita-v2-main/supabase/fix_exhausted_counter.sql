-- Bozuk requests_used_today değerlerini düzelt
-- (markProviderExhausted 999999 set ediyordu, şimdi daily_limit kullanıyor)
UPDATE ai_provider_config
SET requests_used_today = COALESCE(daily_limit, 1500)
WHERE requests_used_today > COALESCE(daily_limit, 1500);
