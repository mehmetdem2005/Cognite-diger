const windows = new Map<string, number[]>()

export function rateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  const events = (windows.get(identifier) || []).filter((ts) => ts > windowStart)

  if (events.length >= maxRequests) {
    const resetAt = events[0] + windowMs
    windows.set(identifier, events)
    return { allowed: false, remaining: 0, resetAt }
  }

  events.push(now)
  windows.set(identifier, events)
  return { allowed: true, remaining: maxRequests - events.length, resetAt: now + windowMs }
}
