/**
 * AI Provider Manager
 * - Reads provider config from Supabase
 * - Selects the best active provider based on priority + remaining capacity
 * - Auto-switches when limits approach thresholds
 * - Updates usage counters after each request
 */
import { createClient } from '@supabase/supabase-js'
import type { AICompletionOptions, AICompletionResult, ProviderConfig } from './providers/types'
import { callGroq } from './providers/groq-provider'
import { callGemini } from './providers/gemini-provider'
import { callOpenAI } from './providers/openai-provider'
import { callDeepSeek } from './providers/deepseek-provider'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

// Simple in-process cache to avoid hammering Supabase on every request
let cachedConfigs: ProviderConfig[] | null = null
let cacheExpiresAt = 0
const CACHE_TTL_MS = 10_000 // 10 seconds

async function getProviderConfigs(): Promise<ProviderConfig[]> {
  const now = Date.now()
  if (cachedConfigs && now < cacheExpiresAt) return cachedConfigs

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('*')
    .order('priority', { ascending: true })

  if (error) throw new Error(`Failed to load provider config: ${error.message}`)
  cachedConfigs = (data || []) as ProviderConfig[]
  cacheExpiresAt = now + CACHE_TTL_MS
  return cachedConfigs
}

function invalidateCache() {
  cachedConfigs = null
  cacheExpiresAt = 0
}

/** Returns remaining capacity for a provider. -1 means unlimited (free). */
function getRemaining(cfg: ProviderConfig): number {
  if (cfg.provider_category === 'free') {
    // Groq-style free — track daily usage vs threshold only
    // We still track requests_used_today but consider it "unlimited" unless daily_limit set
    if (cfg.daily_limit !== null) {
      return cfg.daily_limit - cfg.requests_used_today
    }
    return Infinity
  }
  if (cfg.provider_category === 'free_limited') {
    const limit = cfg.daily_limit ?? 1500
    return limit - cfg.requests_used_today
  }
  // paid
  if (cfg.tokens_remaining !== null) return cfg.tokens_remaining
  return Infinity // No token tracking set → treat as unlimited
}

/** Check if today's date matches last_reset_date, reset if different */
async function maybeResetDailyCounters(configs: ProviderConfig[]): Promise<ProviderConfig[]> {
  const today = new Date().toISOString().split('T')[0]
  const toReset = configs.filter(
    c => (c.provider_category === 'free_limited' || c.provider_category === 'free') &&
         c.last_reset_date !== today &&
         c.requests_used_today > 0
  )
  if (toReset.length === 0) return configs

  const supabase = getServiceSupabase()
  for (const cfg of toReset) {
    await supabase
      .from('ai_provider_config')
      .update({ requests_used_today: 0, tokens_used_today: 0, last_reset_date: today, updated_at: new Date().toISOString() })
      .eq('provider_name', cfg.provider_name)
    cfg.requests_used_today = 0
    cfg.tokens_used_today = 0
    cfg.last_reset_date = today
  }
  return configs
}

/** Pick the best available provider */
export async function selectActiveProvider(): Promise<ProviderConfig> {
  let configs = await getProviderConfigs()
  configs = await maybeResetDailyCounters(configs)

  for (const cfg of configs) {
    if (!cfg.is_enabled) continue
    const remaining = getRemaining(cfg)
    // If remaining is above threshold, this provider is good to use
    if (remaining > cfg.fallback_threshold) {
      return cfg
    }
  }

  throw new Error('Tüm AI sağlayıcıların limiti doldu. Lütfen admin panelinden token yükleyin.')
}

/** Get active provider name for display (doesn't throw, returns 'unknown') */
export async function getActiveProviderName(): Promise<{ name: string; displayName: string }> {
  try {
    const cfg = await selectActiveProvider()
    return { name: cfg.provider_name, displayName: cfg.display_name }
  } catch {
    return { name: 'unknown', displayName: 'Bilinmiyor' }
  }
}

/** Increment usage counter after a successful request, optionally tracking tokens */
async function incrementUsage(providerName: string, tokensUsed?: number) {
  const supabase = getServiceSupabase()
  const today = new Date().toISOString().split('T')[0]
  await supabase.rpc('increment_provider_usage', {
    p_provider_name: providerName,
    p_today: today,
    p_tokens_used: tokensUsed ?? 0,
  })
  invalidateCache()
}

/**
 * Returns true only for DAILY quota exhaustion — marks provider as exhausted for the day.
 * Per-minute rate limits (429 without quota/exhausted keywords) are NOT daily exhaustion;
 * those should just fall through to the next provider without locking it out all day.
 */
function isDailyQuotaError(err: unknown): boolean {
  const msg = ((err as any)?.message || String(err)).toLowerCase()
  return msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('daily limit')
}

/** Any 429-style error (includes per-minute rate limits) */
function isRateLimitError(err: unknown): boolean {
  const msg = ((err as any)?.message || String(err)).toLowerCase()
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')
}

/** Mark a provider as exhausted so selectActiveProvider skips it on next call */
async function markProviderExhausted(providerName: string) {
  const supabase = getServiceSupabase()
  const today = new Date().toISOString().split('T')[0]
  // Use actual daily_limit so the panel shows "1500/1500" instead of "999999/1500"
  const { data } = await supabase
    .from('ai_provider_config')
    .select('daily_limit')
    .eq('provider_name', providerName)
    .single()
  const exhaustedValue = data?.daily_limit ?? 1500
  await supabase
    .from('ai_provider_config')
    .update({ requests_used_today: exhaustedValue, last_reset_date: today, updated_at: new Date().toISOString() })
    .eq('provider_name', providerName)
  invalidateCache()
}

async function callProvider(providerName: string, model: string, options: AICompletionOptions): Promise<AICompletionResult> {
  switch (providerName) {
    case 'groq':
      return callGroq(model, options)
    case 'gemini_free':
    case 'gemini_paid':
      return callGemini(model, options)
    case 'openai':
      return callOpenAI(model, options)
    case 'deepseek':
      return callDeepSeek(model, options)
    default:
      throw new Error(`Unknown provider: ${providerName}`)
  }
}

/** Main entry point: call AI with automatic provider selection.
 *  On quota errors (429/RESOURCE_EXHAUSTED) the failing provider is marked exhausted
 *  and the call is retried with the next available provider.
 *  modelOverride: optional model string, only used when the selected provider supports it (Groq). */
export async function callAI(options: AICompletionOptions, modelOverride?: string): Promise<AICompletionResult> {
  const MAX_ATTEMPTS = 4
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const provider = await selectActiveProvider()
    const model = modelOverride || provider.model_name || 'openai/gpt-oss-120b'

    try {
      const result = await callProvider(provider.provider_name, model, options)

      // Fire-and-forget usage tracking
      incrementUsage(provider.provider_name, result.tokensUsed).catch(() => {})
      result.providerName = provider.provider_name
      return result
    } catch (err) {
      if (isDailyQuotaError(err)) {
        // Günlük kota bitti → provider'ı tüm gün kilitle
        console.warn(`[ai-provider-manager] Provider "${provider.provider_name}" daily quota exhausted, marking and trying next.`)
        await markProviderExhausted(provider.provider_name)
        continue
      }
      if (isRateLimitError(err)) {
        // Dakikalık hız limiti → sadece bu isteği atla, günlük sayacı bozma
        console.warn(`[ai-provider-manager] Provider "${provider.provider_name}" rate limited (per-minute), trying next provider.`)
        continue
      }
      throw err
    }
  }

  throw new Error('Tüm AI sağlayıcıların limiti doldu. Lütfen admin panelinden token yükleyin.')
}
