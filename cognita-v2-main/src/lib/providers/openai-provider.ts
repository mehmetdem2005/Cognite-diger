import type { AICompletionOptions, AICompletionResult } from './types'

export async function callOpenAI(
  model: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 800,
      temperature: options.temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  const usage = data.usage
  return {
    content,
    providerName: 'openai',
    model,
    tokensUsed: usage?.total_tokens,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
  }
}
