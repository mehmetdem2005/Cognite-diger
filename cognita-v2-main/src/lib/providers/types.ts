export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
}

export interface AICompletionResult {
  content: string
  providerName: string
  model: string
  tokensUsed?: number
  promptTokens?: number
  completionTokens?: number
}

export interface ProviderConfig {
  id: string
  provider_name: string
  display_name: string
  is_enabled: boolean
  provider_category: 'paid' | 'free' | 'free_limited'
  daily_limit: number | null
  requests_used_today: number
  last_reset_date: string
  tokens_remaining: number | null
  tokens_used_today: number
  token_daily_limit: number | null
  fallback_threshold: number
  fallback_to: string | null
  priority: number
  model_name: string
  total_requests_made: number
  total_tokens_used: number
  updated_at: string
}
