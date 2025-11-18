import Constants from 'expo-constants';

const TRAKT_CLIENT_ID = Constants.expoConfig?.extra?.traktClientId;
const TRAKT_BASE_URL = 'https://api.trakt.tv';
const HEALTH_CHECK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface HealthCheckResult {
  isHealthy: boolean;
  lastChecked: number;
}

let healthCache: HealthCheckResult | null = null;

/**
 * Check if Trakt API is available and healthy
 * Cached for 5 minutes to avoid hammering the API
 */
export async function isTraktHealthy(): Promise<boolean> {
  // Return cached result if still valid
  if (healthCache && Date.now() - healthCache.lastChecked < HEALTH_CHECK_CACHE_TTL) {
    return healthCache.isHealthy;
  }

  if (!TRAKT_CLIENT_ID) {
    console.warn('⚠️ Trakt API credentials missing - marking as unhealthy');
    healthCache = { isHealthy: false, lastChecked: Date.now() };
    return false;
  }

  try {
    // Lightweight HEAD request to trending endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${TRAKT_BASE_URL}/shows/trending?limit=1`, {
      method: 'HEAD',
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': TRAKT_CLIENT_ID,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isHealthy = response.ok;
    healthCache = { isHealthy, lastChecked: Date.now() };
    
    if (!isHealthy) {
      console.warn(`⚠️ Trakt API health check failed: ${response.status} ${response.statusText}`);
    }

    return isHealthy;
  } catch (error) {
    console.warn('⚠️ Trakt API unreachable:', error instanceof Error ? error.message : String(error));
    healthCache = { isHealthy: false, lastChecked: Date.now() };
    return false;
  }
}

/**
 * Clear health check cache (useful for testing or manual refresh)
 */
export function clearHealthCache(): void {
  healthCache = null;
}
