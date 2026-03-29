import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Safely parse JSON from AI responses.
 * Strips markdown fences and attempts multiple parse strategies.
 */
export function safeParseJSON<T = unknown>(raw: string): { data: T | null; error: string | null } {
  const clean = raw.replace(/```json|```/g, '').trim()

  // Direct parse
  try {
    return { data: JSON.parse(clean) as T, error: null }
  } catch {
    // noop
  }

  // Find first { ... } or [ ... ] block
  const objStart = clean.indexOf('{')
  const arrStart = clean.indexOf('[')
  const start = objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart)

  if (start !== -1) {
    const isArray = clean[start] === '['
    const end = isArray ? clean.lastIndexOf(']') : clean.lastIndexOf('}')
    if (end > start) {
      try {
        return { data: JSON.parse(clean.slice(start, end + 1)) as T, error: null }
      } catch {
        // noop
      }
    }
  }

  return { data: null, error: 'AI geçersiz JSON döndürdü' }
}

/**
 * Create a standardized error response.
 * In production, hides internal error details.
 */
export function errorResponse(err: unknown, status = 500): NextResponse {
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    return NextResponse.json(
      { error: 'Geçersiz istek verisi', details: messages },
      { status: 400 }
    )
  }

  const message = err instanceof Error ? err.message : String(err)
  const isProduction = process.env.NODE_ENV === 'production'

  return NextResponse.json(
    { error: isProduction ? 'Sunucu hatası' : message },
    { status }
  )
}

/**
 * Escape special regex characters in user input to prevent ReDoS.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Escape HTML entities to prevent XSS.
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return str.replace(/[&<>"']/g, c => map[c])
}

/**
 * Sanitize a file extension: only allow known-safe values.
 */
export function sanitizeExtension(filename: string, allowedExtensions: Set<string>, fallback = 'jpg'): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return allowedExtensions.has(ext) ? ext : fallback
}
