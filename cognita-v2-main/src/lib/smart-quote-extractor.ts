/**
 * AI-Powered Smart Quote Extractor
 * 
 * Groq LLaMA ile semantik alıntı çıkarımı
 * - Türkçe metni anlar
 * - Yarım cümleler çıkarıp atmaz
 * - İçeriğe uygun, anlamı tam parçalar seçer
 * - Kalite score ile filtreleme
 */

import { selectActiveProvider } from './ai-provider-manager'
import type { AICompletionResult } from './providers/types'

export interface SmartQuote {
  text: string
  quality_score: number
  is_semantic: boolean
  genre_hint?: string // "romantic", "philosophical", "adventure", vb.
  source?: 'ai' | 'heuristic'
}

interface QuoteCandidate extends SmartQuote {
  id: string
  heuristic_score: number
  normalized: string
}

const MIN_WORDS = 10
const MAX_WORDS = 42
const MIN_LENGTH = 60
const MAX_LENGTH = 280
const ANALYSIS_WINDOW_SIZE = 4200
const ANALYSIS_WINDOW_COUNT = 4
const MAX_CACHE_ENTRIES = 220
const AI_EXTRACTION_TIMEOUT_MS = 4200
const quoteCache = new Map<string, SmartQuote[]>()
const inFlightQuoteCache = new Map<string, Promise<SmartQuote[]>>()

const EMOTION_REGEX = /aşk|sevgi|özlem|kalp|yalnızlık|umut|korku|acı|mutluluk|üzüntü|ruh|hayat|ölüm|anlam|özgürlük|sessizlik|hafıza|zaman|gece|ışık|rüya|vicdan|yol|gölge/i
const WEAK_START_REGEX = /^(ve|veya|ama|fakat|çünkü|gibi|ile|de|da|ki|ancak|yalnız|oysa|sanki)\b/i
const WEAK_END_REGEX = /\b(ve|veya|ama|fakat|çünkü|gibi|ile|de|da|ki|ancak|yalnız|oysa|sanki)$/i
const HEADING_REGEX = /^(bölüm|chapter|kısım|part|sahne|scene|sayfa|page|iii?|iv|vi{0,3}|ix|x)\b/i
const VERB_REGEX = /\b[\wçğıöşü]+(yor|miş|mış|muş|müş|di|dı|du|dü|ti|tı|tu|tü|acak|ecek|ar|er|ır|ir|ur|ür|malı|meli|sin|sın|sun|sün|iz|ız|uz|üz|dır|dir|dur|dür|tir|tır|tur|tür)\b/i

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hashString(value: string): string {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash).toString(36)
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/([A-Za-zÇĞİÖŞÜçğıöşü])-[\s\n]+([A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1$2')
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+([,.;:!?…])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function normalizeForCompare(text: string): string {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[“”"'‘’]/g, '')
    .replace(/[^a-z0-9çğıöşü\s]/gi, '')
    .trim()
}

function finalizeQuoteText(text: string): string {
  return normalizeWhitespace(text)
    .replace(/[\s\-–—,:;]+$/g, '')
    .replace(/^[\-–—\s]+/g, '')
    .trim()
}

function sampleBookContent(content: string): string {
  const normalized = normalizeWhitespace(content)
  if (normalized.length <= ANALYSIS_WINDOW_SIZE * ANALYSIS_WINDOW_COUNT) return normalized

  const step = Math.floor((normalized.length - ANALYSIS_WINDOW_SIZE) / Math.max(1, ANALYSIS_WINDOW_COUNT - 1))
  const slices: string[] = []

  for (let index = 0; index < ANALYSIS_WINDOW_COUNT; index += 1) {
    const start = Math.max(0, Math.min(normalized.length - ANALYSIS_WINDOW_SIZE, index * step))
    slices.push(normalized.slice(start, start + ANALYSIS_WINDOW_SIZE))
  }

  return slices.join(' ')
}

function splitIntoSentences(content: string): string[] {
  const normalized = normalizeWhitespace(content)
  const matched = normalized.match(/[^.!?…\n]+[.!?…]+(?:["”')\]]+)?/g)

  if (matched?.length) {
    return matched
      .map(sentence => normalizeWhitespace(sentence))
      .filter(Boolean)
  }

  return normalized
    .split(/(?<=[.!?…])\s+/)
    .map(sentence => normalizeWhitespace(sentence))
    .filter(Boolean)
}

function hasBalancedPairs(text: string): boolean {
  const stack: string[] = []
  const pairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '"': '"',
    '“': '”',
  }
  const closing = new Set(Object.values(pairs))

  for (const character of text) {
    if (pairs[character]) {
      if (character === '"' && stack[stack.length - 1] === '"') stack.pop()
      else stack.push(character)
      continue
    }

    if (!closing.has(character)) continue

    const last = stack.pop()
    if (!last || pairs[last] !== character) return false
  }

  return stack.length === 0
}

function hasMeaningfulStructure(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < MIN_WORDS) return false

  const contentWords = words.filter(word => word.length >= 4)
  if (contentWords.length < 4) return false

  const hasVerb = VERB_REGEX.test(text) || /\b(değil|vardır|yoktur|olur|olmaz|gerekir|lazım)\b/i.test(text)
  if (!hasVerb) return false

  const alphabeticChars = (text.match(/[a-zçğıöşü]/gi) || []).length
  const ratio = alphabeticChars / Math.max(1, text.length)
  if (ratio < 0.62) return false

  return true
}

function isStandaloneCandidate(text: string): boolean {
  if (!/[.!?…]["”')\]]?$/.test(text)) return false
  if (HEADING_REGEX.test(text)) return false
  if (WEAK_START_REGEX.test(text) || WEAK_END_REGEX.test(text)) return false
  if (!/[a-zçğıöşü]/i.test(text)) return false
  if ((text.match(/\d/g) || []).length > 6) return false
  if ((text.match(/[^\w\sçğıöşüÇĞİÖŞÜ,.;:!?"'()\-]/g) || []).length > 8) return false
  if (/(.)\1{3,}/.test(text)) return false
  if (/\b(?:bkz|www|http|instagram|twitter|tiktok)\b/i.test(text)) return false
  if (!hasBalancedPairs(text)) return false

  return true
}

function scoreCandidate(text: string): number {
  const words = text.split(/\s+/).filter(Boolean)
  const commaCount = (text.match(/[,:;]/g) || []).length
  const uppercaseCount = (text.match(/[A-ZÇĞİÖŞÜ]/g) || []).length
  const uppercaseRatio = uppercaseCount / Math.max(1, text.length)
  let score = 5.4

  if (words.length >= 12 && words.length <= 28) score += 1.5
  else if (words.length <= MAX_WORDS) score += 0.6
  else score -= 1.1

  if (text.length >= 85 && text.length <= 210) score += 1.1
  if (commaCount >= 1 && commaCount <= 3) score += 0.7
  if (EMOTION_REGEX.test(text)) score += 1.2
  if (hasMeaningfulStructure(text)) score += 0.9
  if (/[;:]/.test(text)) score += 0.3
  if (/\b(çünkü|fakat|oysa|ancak|sanki|belki|yine de|bu yüzden|üstelik|dolayısıyla)\b/i.test(text)) score += 0.45
  if (/\b(ben|sen|o|biz|siz|onlar)\b/i.test(text)) score += 0.15
  if (/\b(şey|madde|liste|tablo|bkz|örn|örnek)\b/i.test(text)) score -= 1.1
  if (/\b(www|http|isbn|pdf)\b/i.test(text)) score -= 2
  if (uppercaseRatio > 0.16) score -= 1

  return clamp(score, 0, 10)
}

function buildCandidate(text: string): QuoteCandidate | null {
  const normalizedText = finalizeQuoteText(text)
  const words = normalizedText.split(/\s+/).filter(Boolean)

  if (normalizedText.length < MIN_LENGTH || normalizedText.length > MAX_LENGTH) return null
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return null
  if (!isStandaloneCandidate(normalizedText)) return null
  if (!hasMeaningfulStructure(normalizedText)) return null

  const heuristicScore = scoreCandidate(normalizedText)
  if (heuristicScore < 6.9) return null

  const normalized = normalizeForCompare(normalizedText)

  return {
    id: hashString(normalizedText),
    text: normalizedText,
    quality_score: heuristicScore,
    heuristic_score: heuristicScore,
    is_semantic: false,
    genre_hint: inferGenreFromText(normalizedText),
    normalized,
    source: 'heuristic',
  }
}

function buildQuoteCandidates(content: string, limit: number): QuoteCandidate[] {
  const analysisText = sampleBookContent(content)
  const sentences = splitIntoSentences(analysisText)
    .filter(s => s.length >= MIN_LENGTH && s.length <= MAX_LENGTH)
  const deduped = new Map<string, QuoteCandidate>()
  const contentLower = analysisText.toLowerCase()
  const hasEmotionalContent = EMOTION_REGEX.test(contentLower)

  // Tek cümleleri kontrol et (daha hızlı)
  for (const sentence of sentences) {
    const candidate = buildCandidate(sentence)
    if (candidate) {
      const existing = deduped.get(candidate.normalized)
      if (!existing || candidate.heuristic_score > existing.heuristic_score) {
        deduped.set(candidate.normalized, candidate)
      }
    }
  }

  // Kombinasyonlar: 2-3 cümleyi birleştir (fakat yalnızca duygusal içerikte)
  if (hasEmotionalContent) {
    for (let start = 0; start < sentences.length - 1; start += 1) {
      for (let span = 1; span <= 2 && start + span < sentences.length; span += 1) {
        const combined = sentences.slice(start, start + span + 1).join(' ')
        const wordCount = combined.split(/\s+/).filter(Boolean).length
        if (wordCount > MAX_WORDS || combined.length > MAX_LENGTH) continue

        const candidate = buildCandidate(combined)
        if (!candidate) continue

        const existing = deduped.get(candidate.normalized)
        if (!existing || candidate.heuristic_score > existing.heuristic_score) {
          deduped.set(candidate.normalized, candidate)
        }
      }
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => right.heuristic_score - left.heuristic_score)
    .slice(0, Math.min(limit, 20)) // Sınırla : hız için
}

function createCacheKey(bookContent: string, bookTitle: string, count: number, useAI: boolean): string {
  return [bookTitle, bookContent.length, hashString(bookContent.slice(0, 2400)), count, useAI ? 'ai' : 'fallback'].join(':')
}

function setCachedQuotes(cacheKey: string, quotes: SmartQuote[]) {
  quoteCache.set(cacheKey, quotes)
  if (quoteCache.size <= MAX_CACHE_ENTRIES) return

  const oldestKey = quoteCache.keys().next().value
  if (oldestKey) quoteCache.delete(oldestKey)
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    }),
  ])
}

function normalizeGenre(genre?: string): string | undefined {
  const safeGenre = (genre || '').toLowerCase().trim()
  if (!safeGenre) return undefined

  if (safeGenre.includes('rom')) return 'romantic'
  if (safeGenre.includes('phil') || safeGenre.includes('felse')) return 'philosophical'
  if (safeGenre.includes('sci') || safeGenre.includes('uzay') || safeGenre.includes('gelecek')) return 'scifi'
  if (safeGenre.includes('macera') || safeGenre.includes('adventure') || safeGenre.includes('heyecan')) return 'adventure'
  if (safeGenre.includes('sanat') || safeGenre.includes('arti')) return 'artistic'
  if (safeGenre.includes('tarih') || safeGenre.includes('history')) return 'historical'
  if (safeGenre.includes('mizah') || safeGenre.includes('humor')) return 'humorous'

  return 'general'
}

// Yazı türü tahmin etme (sonra müzik seçilecek)
export function inferGenreFromText(text: string): string {
  const lowerText = text.toLowerCase()
  
  if (/aşk|sevgi|kalp|romantik|duygusal|özlem|hasret/.test(lowerText)) return 'romantic'
  if (/bilim|teknoloji|robot|yapay zeka|gelecek|uzay/.test(lowerText)) return 'scifi'
  if (/felsefe|ölüm|yaşam|anlamı|varlık|bilinç|ruh/.test(lowerText)) return 'philosophical'
  if (/macera|savaş|tehlike|korku|kaçış|kurtarış/.test(lowerText)) return 'adventure'
  if (/güzellik|sanat|renk|müzik|estetik|poetik/.test(lowerText)) return 'artistic'
  if (/kültür|tarih|medeniyeti|geçmiş|efsane|mitos/.test(lowerText)) return 'historical'
  if (/mizah|komik|gülme|şaka|eğlence/.test(lowerText)) return 'humorous'
  
  return 'general'
}

/**
 * Groq ile AI-tabanlı alıntı çıkarma
 */
async function extractWithAI(bookContent: string, bookTitle: string, count: number = 3): Promise<SmartQuote[]> {
  try {
    const candidates = buildQuoteCandidates(bookContent, Math.max(12, count * 6))
    if (!candidates.length) return []

    const systemPrompt = `Sen bir edebiyat editörüsün. Sana yalnızca TAM cümlelerden oluşan aday alıntılar verilecek.

Görev:
1. Sadece verilen adaylar arasından seçim yap.
2. Yeni cümle yazma, mevcut cümleyi kısaltma, uzatma veya birleştirme.
3. Bağımsız anlam taşıyan, tek başına okununca güçlü duran alıntıları seç.
4. Teknik, bağlamsız veya mekanik duran adayları ele.
5. En iyi ${count} adayı seç ve sadece JSON array döndür.
6. Noktalama ve metin birebir korunmalı.

JSON biçimi:
[
  { "id": "aday_id", "score": 9.4, "genre": "romantic" }
]

Genre değerleri: romantic, philosophical, scifi, adventure, artistic, historical, humorous, general`

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: `Kitap: "${bookTitle}"\n\nAday alıntılar:\n${candidates
          .map(candidate => `- ${candidate.id}: ${candidate.text}`)
          .join('\n')}\n\nSadece en iyi ${count} adayı seç ve JSON array döndür.`,
      },
    ]

    const provider = await selectActiveProvider()
    const callProvider = provider.provider_name === 'groq' ? 'groq'
      : provider.provider_name === 'openai' ? 'openai'
      : provider.provider_name === 'gemini' ? 'gemini'
      : 'groq' // fallback

    let result: AICompletionResult

    if (callProvider === 'groq') {
      const { callGroq } = await import('./providers/groq-provider')
      result = await withTimeout(callGroq(provider.model_name || 'llama-3.1-8b-instant', {
        messages,
        maxTokens: 800,
        temperature: 0.3, // Daha deterministik
      }), AI_EXTRACTION_TIMEOUT_MS)
    } else if (callProvider === 'openai') {
      const { callOpenAI } = await import('./providers/openai-provider')
      result = await withTimeout(callOpenAI(provider.model_name || 'gpt-4o-mini', {
        messages,
        maxTokens: 800,
        temperature: 0.3,
      }), AI_EXTRACTION_TIMEOUT_MS)
    } else {
      const { callGemini } = await import('./providers/gemini-provider')
      result = await withTimeout(callGemini(provider.model_name || 'gemini-2.0-flash', {
        messages,
        maxTokens: 800,
        temperature: 0.3,
      }), AI_EXTRACTION_TIMEOUT_MS)
    }

    // JSON parse et
    const content = result.content.trim()
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('JSON parse hatası')

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ id: string; score: number; genre?: string }>
    const candidateMap = new Map(candidates.map(candidate => [candidate.id, candidate]))
    const selected = parsed
      .map(entry => {
        const candidate = candidateMap.get(String(entry.id))
        if (!candidate) return null

        return {
          text: candidate.text,
          quality_score: clamp(Math.max(candidate.heuristic_score, Number(entry.score) || candidate.heuristic_score), 0, 10),
          is_semantic: true,
          genre_hint: normalizeGenre(entry.genre) || candidate.genre_hint,
          source: 'ai' as const,
        }
      })
      .filter(Boolean) as SmartQuote[]

    const topHeuristic = candidates
      .map(candidate => ({
        text: candidate.text,
        quality_score: candidate.heuristic_score,
        is_semantic: false,
        genre_hint: candidate.genre_hint,
        source: 'heuristic' as const,
      }))
      .filter(candidate => selected.every(sel => sel.text !== candidate.text))

    return [...selected, ...topHeuristic]
      .filter((quote, index, list) => list.findIndex(entry => entry.text === quote.text) === index)
      .sort((left, right) => right.quality_score - left.quality_score)
      .slice(0, count)
  } catch (error) {
    console.error('AI quote extraction error:', error)
    return []
  }
}

/**
 * Fallback: Basit algoritma (AI başarısızsa)
 */
function extractWithFallback(content: string, count: number = 3): SmartQuote[] {
  const candidates = buildQuoteCandidates(content, Math.max(8, count * 4))
  if (candidates.length) {
    return candidates
      .slice(0, count)
      .map(({ text, quality_score, genre_hint, source }) => ({
        text,
        quality_score,
        is_semantic: false,
        genre_hint,
        source,
      }))
  }

  const sentences = splitIntoSentences(sampleBookContent(content))
    .filter(sentence => sentence.length >= MIN_LENGTH && sentence.length <= MAX_LENGTH)

  return sentences
    .slice(0, count)
    .map(text => ({
      text,
      quality_score: 6.2,
      is_semantic: false,
      genre_hint: inferGenreFromText(text),
      source: 'heuristic' as const,
    }))
}

/**
 * Ana fonksiyon: Akıllı alıntı çıkarım
 */
export async function extractSmartQuotes(
  bookContent: string,
  bookTitle: string,
  count: number = 3,
  useAI: boolean = true
): Promise<SmartQuote[]> {
  const cacheKey = createCacheKey(bookContent, bookTitle, count, useAI)
  const cached = quoteCache.get(cacheKey)
  if (cached) return cached.slice(0, count)

  const inFlight = inFlightQuoteCache.get(cacheKey)
  if (inFlight) {
    const result = await inFlight
    return result.slice(0, count)
  }

  const extractionPromise = (async () => {
    if (!bookContent || bookContent.length < 500) {
      const fallbackQuotes = extractWithFallback(bookContent, count)
      setCachedQuotes(cacheKey, fallbackQuotes)
      return fallbackQuotes
    }

    if (useAI) {
      const aiQuotes = await extractWithAI(bookContent, bookTitle, count)
      if (aiQuotes.length > 0) {
        setCachedQuotes(cacheKey, aiQuotes)
        return aiQuotes
      }
    }

    const fallbackQuotes = extractWithFallback(bookContent, count)
    setCachedQuotes(cacheKey, fallbackQuotes)
    return fallbackQuotes
  })()

  inFlightQuoteCache.set(cacheKey, extractionPromise)
  try {
    return await extractionPromise
  } finally {
    inFlightQuoteCache.delete(cacheKey)
  }
}

/**
 * Genre-based background music selector
 */
export function getMusicForGenre(genre?: string): {
  playlist_id: string
  name: string
  vibe: string
  audioUrl: string
  spotifyUri?: string
} {
  const musicMap: Record<string, any> = {
    romantic: {
      playlist_id: 'romantic_nocturnes',
      name: 'Romantik Noktürn',
      vibe: 'Chopin, Debussy ve yumuşak piyano dokusu',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
      spotifyUri: 'spotify:playlist:romantic_piano',
    },
    philosophical: {
      playlist_id: 'philosophical_adagio',
      name: 'Düşünsel Adagio',
      vibe: 'Satie, Arvo Part ve yavaş yaylılar',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
      spotifyUri: 'spotify:playlist:philosophical_ambient',
    },
    scifi: {
      playlist_id: 'modern_classical_tension',
      name: 'Modern Klasik Gerilim',
      vibe: 'Glass, Richter ve nabız hissi veren yaylılar',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
      spotifyUri: 'spotify:playlist:synthwave_vibes',
    },
    adventure: {
      playlist_id: 'adventure_symphony',
      name: 'Heyecanlı Senfoni',
      vibe: 'Beethoven, Holst ve hareketli yaylılar',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      spotifyUri: 'spotify:playlist:epic_orchestral',
    },
    artistic: {
      playlist_id: 'impressionist_gallery',
      name: 'Empresyonist Salon',
      vibe: 'Ravel, Debussy ve renkli armoniler',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
      spotifyUri: 'spotify:playlist:impressionist_classics',
    },
    historical: {
      playlist_id: 'baroque_chamber',
      name: 'Barok Oda Müziği',
      vibe: 'Bach, Vivaldi ve dönemsel doku',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
      spotifyUri: 'spotify:playlist:baroque_masters',
    },
    humorous: {
      playlist_id: 'playful_chamber',
      name: 'Neşeli Oda Müziği',
      vibe: 'Mozart divertimento ve hafif yaylılar',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      spotifyUri: 'spotify:playlist:funny_jazz',
    },
    general: {
      playlist_id: 'general_reading_room',
      name: 'Sessiz Okuma Salonu',
      vibe: 'Yumuşak piyano, sakin yaylılar ve klasik atmosfer',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
      spotifyUri: 'spotify:playlist:coffee_shop_jazz',
    },
  }

  return musicMap[genre || 'general'] || musicMap.general
}
