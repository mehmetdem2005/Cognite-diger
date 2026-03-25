import type { AICompletionOptions, AICompletionResult } from './types'

export async function callGemini(
  model: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  // Convert messages: Gemini uses 'user'/'model' roles and separate system instruction
  const systemMsg = options.messages.find(m => m.role === 'system')
  const chatMessages = options.messages.filter(m => m.role !== 'system')

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 800,
      temperature: options.temperature ?? 1.0,
    },
  }

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const usage = data.usageMetadata
  return {
    content,
    providerName: 'gemini',
    model,
    tokensUsed: usage ? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0) : undefined,
    promptTokens: usage?.promptTokenCount,
    completionTokens: usage?.candidatesTokenCount,
  }
}
