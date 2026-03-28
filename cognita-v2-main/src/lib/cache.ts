type CacheEntry = {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function setCache(key: string, data: unknown, ttlMs = 300_000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function invalidateCache(prefix: string) {
  cache.forEach((_value, key) => {
    if (key.startsWith(prefix)) cache.delete(key)
  })
}
