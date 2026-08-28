const PREFIX = 'velour_cache_'

interface CacheEntry<T> {
  data: T
  savedAt: number
}

export function readCache<T>(key: string, ttlMs = 24 * 60 * 60 * 1000): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.savedAt > ttlMs) return null
    return entry.data
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() } as CacheEntry<T>))
  } catch {
  }
}

export function removeCache(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
  }
}