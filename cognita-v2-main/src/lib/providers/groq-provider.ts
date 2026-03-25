import Groq from 'groq-sdk'
import type { AICompletionOptions, AICompletionResult } from './types'

export async function callGroq(
  model: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model,
    messages: options.messages as any,
    max_tokens: options.maxTokens ?? 800,
    temperature: options.temperature,
  })
  const usage = completion.usage
  return {
    content: completion.choices[0]?.message?.content || '',
    providerName: 'groq',
    model,
    tokensUsed: usage?.total_tokens,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
  }
}
