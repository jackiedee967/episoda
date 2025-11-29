import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@episoda_show_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MEMORY_CACHE_SIZE = 100;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function getCacheKey(type: string, id: string | number): string {
  return `${CACHE_PREFIX}${type}_${id}`;
}

function isExpired(entry: CacheEntry<any>): boolean {
  return Date.now() > entry.expiresAt;
}

function pruneMemoryCache(): void {
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - MAX_MEMORY_CACHE_SIZE);
    toRemove.forEach(([key]) => memoryCache.delete(key));
  }
}

export async function getCached<T>(type: string, id: string | number): Promise<T | null> {
  const cacheKey = getCacheKey(type, id);
  
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && !isExpired(memEntry)) {
    memEntry.timestamp = Date.now();
    return memEntry.data as T;
  }
  
  try {
    const stored = await AsyncStorage.getItem(cacheKey);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      if (!isExpired(entry)) {
        memoryCache.set(cacheKey, { ...entry, timestamp: Date.now() });
        pruneMemoryCache();
        return entry.data;
      } else {
        await AsyncStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  
  return null;
}

export async function setCache<T>(type: string, id: string | number, data: T, ttlMs: number = CACHE_TTL_MS): Promise<void> {
  const cacheKey = getCacheKey(type, id);
  const now = Date.now();
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    expiresAt: now + ttlMs,
  };
  
  memoryCache.set(cacheKey, entry);
  pruneMemoryCache();
  
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

export async function invalidateCache(type: string, id: string | number): Promise<void> {
  const cacheKey = getCacheKey(type, id);
  memoryCache.delete(cacheKey);
  
  try {
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn('Cache invalidate error:', error);
  }
}

export async function clearAllShowCache(): Promise<void> {
  memoryCache.clear();
  
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}

export function getCacheStats(): { memorySize: number; hitRate: string } {
  return {
    memorySize: memoryCache.size,
    hitRate: 'N/A',
  };
}

export const CACHE_TYPES = {
  SHOW_DETAILS: 'show',
  SHOW_SEASONS: 'seasons',
  SHOW_EPISODES: 'episodes',
  SHOW_POSTER: 'poster',
  SEARCH_RESULTS: 'search',
  TRENDING: 'trending',
  POPULAR: 'popular',
} as const;

export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,
  MEDIUM: 60 * 60 * 1000,
  LONG: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
