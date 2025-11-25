import Constants from 'expo-constants';

const getTMDBApiKey = () => {
  // Prefer runtime process.env for server environments, then fall back to Expo Constants
  const key = 
    process.env.TMDB_API_KEY ||
    Constants.expoConfig?.extra?.tmdbApiKey ||
    Constants.manifest?.extra?.tmdbApiKey ||
    Constants.manifest2?.extra?.expoClient?.extra?.tmdbApiKey ||
    '';
  
  if (!key) {
    console.warn('⚠️ TMDB API key not configured. Poster enrichment will fall back to OMDB/TVMaze.');
  } else {
    console.log('✅ TMDB API key loaded successfully (length:', key.length, ')');
  }
  
  return key;
};

const TMDB_API_KEY = getTMDBApiKey();
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export interface TMDBShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date?: string;
  overview: string;
  status?: string;
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBShow[];
  total_results: number;
  total_pages: number;
}

export async function searchShowByName(showName: string, year?: number | null): Promise<TMDBShow | null> {
  if (!TMDB_API_KEY) {
    console.log('⚠️ TMDB API key not configured');
    return null;
  }

  try {
    console.log(`🔍 TMDB search: "${showName}"${year ? ` (${year})` : ''}`);
    
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query: showName,
      include_adult: 'true',
    });
    
    if (year) {
      params.append('first_air_date_year', year.toString());
    }
    
    const response = await fetch(`${TMDB_BASE_URL}/search/tv?${params}`);
    
    if (!response.ok) {
      console.error(`❌ TMDB API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data: TMDBSearchResult = await response.json();
    
    if (data.results.length === 0) {
      console.log(`⚠️ TMDB: No results for "${showName}"`);
      return null;
    }
    
    const show = data.results[0];
    console.log(`✅ TMDB found: ${show.name}, poster: ${!!show.poster_path}`);
    return show;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ TMDB search error for "${showName}":`, errorMsg);
    return null;
  }
}

export function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}${posterPath}`;
}

export function getBackdropUrl(backdropPath: string | null): string | null {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}${backdropPath}`;
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBKeywordsResponse {
  results: TMDBKeyword[];
}

export async function getShowDetails(tmdbId: number): Promise<TMDBShow | null> {
  if (!TMDB_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      console.error(`❌ TMDB details API error: ${response.status}`);
      return null;
    }

    const data: TMDBShow = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching TMDB details:`, error);
    return null;
  }
}

export async function getShowKeywords(tmdbId: number): Promise<string[]> {
  if (!TMDB_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/keywords?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      console.error(`❌ TMDB keywords API error: ${response.status}`);
      return [];
    }

    const data: TMDBKeywordsResponse = await response.json();
    return data.results.map(k => k.name);
  } catch (error) {
    console.error(`❌ Error fetching TMDB keywords:`, error);
    return [];
  }
}

export interface TMDBDiscoverParams {
  genreIds?: number[];
  keywordIds?: number[];
  page?: number;
  sortBy?: 'popularity.desc' | 'vote_average.desc' | 'first_air_date.desc';
}

export async function discoverShows(params: TMDBDiscoverParams): Promise<TMDBShow[]> {
  if (!TMDB_API_KEY) {
    console.log('⚠️ TMDB API key not configured');
    return [];
  }

  try {
    const urlParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      include_adult: 'true',
      page: (params.page || 1).toString(),
      sort_by: params.sortBy || 'popularity.desc',
    });

    if (params.genreIds && params.genreIds.length > 0) {
      urlParams.append('with_genres', params.genreIds.join(','));
    }

    if (params.keywordIds && params.keywordIds.length > 0) {
      urlParams.append('with_keywords', params.keywordIds.join(','));
    }

    const response = await fetch(`${TMDB_BASE_URL}/discover/tv?${urlParams}`);

    if (!response.ok) {
      console.error(`❌ TMDB discover API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: TMDBSearchResult = await response.json();
    console.log(`✅ TMDB discover found ${data.results.length} shows`);
    return data.results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ TMDB discover error:`, errorMsg);
    return [];
  }
}

export interface TMDBRecommendation {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date?: string;
  overview?: string;
  vote_average?: number;
  genre_ids?: number[];
  origin_country?: string[];
}

export interface TMDBRecommendationsResponse {
  results: TMDBRecommendation[];
}

export async function getShowRecommendations(tmdbId: number): Promise<TMDBRecommendation[]> {
  if (!TMDB_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/recommendations?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const data: TMDBRecommendationsResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error(`❌ Error fetching TMDB recommendations:`, error);
    return [];
  }
}

export async function getSimilarShows(tmdbId: number): Promise<TMDBRecommendation[]> {
  if (!TMDB_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/similar?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const data: TMDBRecommendationsResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error(`❌ Error fetching TMDB similar shows:`, error);
    return [];
  }
}

export interface TMDBExternalIds {
  imdb_id?: string | null;
  tvdb_id?: number | null;
  tvrage_id?: number | null;
}

/**
 * Get external IDs (IMDB, TVDB) for a TMDB show
 * Note: TMDB doesn't provide Trakt IDs, so we'll use IMDB ID to look up on Trakt
 */
export async function getExternalIds(tmdbId: number): Promise<TMDBExternalIds | null> {
  if (!TMDB_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      return null;
    }

    const data: TMDBExternalIds = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching TMDB external IDs:`, error);
    return null;
  }
}

export interface WatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface WatchProvidersResult {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  ads?: WatchProvider[];
  free?: WatchProvider[];
}

export interface WatchProvidersResponse {
  id: number;
  results: {
    [countryCode: string]: WatchProvidersResult;
  };
}

export function getProviderLogoUrl(logoPath: string): string {
  return `https://image.tmdb.org/t/p/w92${logoPath}`;
}

function getBaseServiceName(providerName: string): string {
  return providerName
    .toLowerCase()
    .replace(/\s*(via|with|on)\s+.*$/i, '')
    .replace(/\s*(amazon|prime video)\s+channel[s]?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isChannelAddon(providerName: string): boolean {
  const lowerName = providerName.toLowerCase();
  return (
    lowerName.includes('amazon channel') ||
    lowerName.includes('prime video channel') ||
    lowerName.includes(' via ') ||
    lowerName.includes(' with ')
  );
}

export async function getWatchProviders(tmdbId: number, countryCode: string = 'US'): Promise<WatchProvider[]> {
  if (!TMDB_API_KEY) {
    console.log('⚠️ TMDB API key not configured for watch providers');
    return [];
  }

  try {
    console.log(`📺 Fetching watch providers for TMDB ID ${tmdbId}...`);
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      console.error(`❌ TMDB watch providers API error: ${response.status}`);
      return [];
    }

    const data: WatchProvidersResponse = await response.json();
    
    const countryData = data.results[countryCode];
    if (!countryData) {
      console.log(`⚠️ No watch providers found for country: ${countryCode}`);
      return [];
    }

    const allProviders: WatchProvider[] = [];
    const seenIds = new Set<number>();

    const collectProviders = (list: WatchProvider[] | undefined) => {
      if (!list) return;
      for (const provider of list) {
        if (!seenIds.has(provider.provider_id)) {
          seenIds.add(provider.provider_id);
          allProviders.push(provider);
        }
      }
    };

    collectProviders(countryData.flatrate);
    collectProviders(countryData.free);
    collectProviders(countryData.ads);

    const mainProviders: WatchProvider[] = [];
    const channelAddons: WatchProvider[] = [];
    
    for (const provider of allProviders) {
      if (isChannelAddon(provider.provider_name)) {
        channelAddons.push(provider);
      } else {
        mainProviders.push(provider);
      }
    }

    const seenBaseNames = new Set<string>();
    const finalProviders: WatchProvider[] = [];

    for (const provider of mainProviders) {
      const baseName = getBaseServiceName(provider.provider_name);
      if (!seenBaseNames.has(baseName)) {
        seenBaseNames.add(baseName);
        finalProviders.push(provider);
      }
    }

    for (const provider of channelAddons) {
      const baseName = getBaseServiceName(provider.provider_name);
      if (!seenBaseNames.has(baseName)) {
        seenBaseNames.add(baseName);
        finalProviders.push(provider);
      }
    }

    finalProviders.sort((a, b) => a.display_priority - b.display_priority);

    console.log(`✅ Found ${finalProviders.length} unique streaming providers for ${countryCode}`);
    return finalProviders;
  } catch (error) {
    console.error(`❌ Error fetching watch providers:`, error);
    return [];
  }
}

export async function findTMDBIdByName(showName: string, year?: number | null): Promise<number | null> {
  const show = await searchShowByName(showName, year);
  return show?.id || null;
}
