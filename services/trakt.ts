import Constants from 'expo-constants';

const TRAKT_CLIENT_ID = Constants.expoConfig?.extra?.traktClientId;
const TRAKT_BASE_URL = 'https://api.trakt.tv';

if (!TRAKT_CLIENT_ID) {
  console.warn('⚠️ Trakt API Client ID not configured. Search functionality will not work.');
}

const TRAKT_HEADERS = {
  'Content-Type': 'application/json',
  'trakt-api-version': '2',
  'trakt-api-key': TRAKT_CLIENT_ID || '',
};

export interface TraktShow {
  title: string;
  year: number;
  ids: {
    trakt: number;
    slug: string;
    tvdb: number | null;
    imdb: string | null;
    tmdb: number | null;
  };
  overview?: string;
  first_aired?: string;
  runtime?: number;
  rating?: number;
  votes?: number;
  genres?: string[];
  status?: string;
  network?: string;
  country?: string;
  language?: string;
  aired_episodes?: number;
}

export interface TraktSearchResult {
  type: string;
  score: number;
  show: TraktShow;
}

export interface TraktSeason {
  number: number;
  ids: {
    trakt: number;
    tvdb: number | null;
    tmdb: number | null;
  };
  rating?: number;
  votes?: number;
  episode_count?: number;
  aired_episodes?: number;
  title?: string;
  overview?: string;
  first_aired?: string;
  network?: string;
}

export interface TraktEpisode {
  season: number;
  number: number;
  title: string;
  ids: {
    trakt: number;
    tvdb: number | null;
    imdb: string | null;
    tmdb: number | null;
  };
  overview?: string;
  rating?: number;
  votes?: number;
  first_aired?: string;
  runtime?: number;
}

export async function searchShows(query: string): Promise<TraktSearchResult[]> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured. Please check your environment setup.');
  }

  try {
    console.log('🔍 Searching Trakt for:', query);
    const response = await fetch(
      `${TRAKT_BASE_URL}/search/show?query=${encodeURIComponent(query)}&extended=full`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    const data: TraktSearchResult[] = await response.json();
    console.log(`✅ Found ${data.length} shows`);
    return data;
  } catch (error) {
    console.error('❌ Error searching shows on Trakt:', error);
    throw error;
  }
}

export async function getShowDetails(traktId: number | string): Promise<TraktShow> {
  if (!TRAKT_CLIENT_ID) {
    throw new Error('Trakt API credentials not configured');
  }

  try {
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/${traktId}?extended=full`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    const data: TraktShow = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching show details from Trakt:', error);
    throw error;
  }
}

export async function getShowSeasons(traktId: number | string): Promise<TraktSeason[]> {
  if (!TRAKT_CLIENT_ID) {
    throw new Error('Trakt API credentials not configured');
  }

  try {
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/${traktId}/seasons?extended=full`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    const data: TraktSeason[] = await response.json();
    return data.filter(season => season.number > 0);
  } catch (error) {
    console.error('Error fetching show seasons from Trakt:', error);
    throw error;
  }
}

export async function getSeasonEpisodes(
  traktId: number | string,
  seasonNumber: number
): Promise<TraktEpisode[]> {
  if (!TRAKT_CLIENT_ID) {
    throw new Error('Trakt API credentials not configured');
  }

  try {
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/${traktId}/seasons/${seasonNumber}?extended=full`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    const data: TraktEpisode[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching season episodes from Trakt:', error);
    throw error;
  }
}

export async function getAllEpisodes(traktId: number | string): Promise<TraktEpisode[]> {
  try {
    const seasons = await getShowSeasons(traktId);
    const allEpisodes: TraktEpisode[] = [];

    for (const season of seasons) {
      const episodes = await getSeasonEpisodes(traktId, season.number);
      allEpisodes.push(...episodes);
    }

    return allEpisodes;
  } catch (error) {
    console.error('Error fetching all episodes from Trakt:', error);
    throw error;
  }
}
