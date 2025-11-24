import { ENV } from '@/config/env';

const TRAKT_CLIENT_ID = ENV.TRAKT_CLIENT_ID;
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
  end_year?: number;
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
    trakt: number | null;
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

export interface SearchShowsOptions {
  page?: number;
  limit?: number;
}

export interface SearchShowsResponse {
  results: TraktSearchResult[];
  pagination: {
    page: number;
    limit: number;
    pageCount: number;
    itemCount: number;
  };
}

export async function searchShows(
  query: string, 
  options: SearchShowsOptions = {}
): Promise<SearchShowsResponse> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured. Please check your environment setup.');
  }

  const { page = 1, limit = 50 } = options;

  try {
    console.log(`🔍 Searching Trakt for: "${query}" (page ${page}, limit ${limit})`);
    const response = await fetch(
      `${TRAKT_BASE_URL}/search/show?query=${encodeURIComponent(query)}&extended=full&page=${page}&limit=${limit}`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `Trakt API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const data: TraktSearchResult[] = await response.json();
    
    const pagination = {
      page: parseInt(response.headers.get('X-Pagination-Page') || '1'),
      limit: parseInt(response.headers.get('X-Pagination-Limit') || String(limit)),
      pageCount: parseInt(response.headers.get('X-Pagination-Page-Count') || '1'),
      itemCount: parseInt(response.headers.get('X-Pagination-Item-Count') || String(data.length)),
    };
    
    console.log(`✅ Found ${data.length} shows on page ${pagination.page} of ${pagination.pageCount} (${pagination.itemCount} total)`);
    
    return { results: data, pagination };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error searching shows';
    console.error('❌ Error searching shows on Trakt:', errorMsg);
    throw new Error(errorMsg);
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
      const errorText = await response.text();
      const errorMsg = `Trakt API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const data: TraktShow = await response.json();
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error fetching show details';
    console.error('❌ Error fetching show details from Trakt:', errorMsg);
    throw new Error(errorMsg);
  }
}

export async function getShowSeasons(traktId: number | string): Promise<TraktSeason[]> {
  if (!TRAKT_CLIENT_ID) {
    const errorMsg = 'Trakt API credentials not configured';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/${traktId}/seasons?extended=full`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `Trakt API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const data: TraktSeason[] = await response.json();
    return data.filter(season => season.number > 0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error fetching seasons';
    console.error('❌ Error fetching show seasons from Trakt:', errorMsg);
    throw new Error(errorMsg);
  }
}

export async function getSeasonEpisodes(
  traktId: number | string,
  seasonNumber: number
): Promise<TraktEpisode[]> {
  if (!TRAKT_CLIENT_ID) {
    const errorMsg = 'Trakt API credentials not configured';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/${traktId}/seasons/${seasonNumber}?extended=full`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `Trakt API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const data: TraktEpisode[] = await response.json();
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error fetching episodes';
    console.error('❌ Error fetching season episodes from Trakt:', errorMsg);
    throw new Error(errorMsg);
  }
}

export async function fetchShowEndYear(
  traktShow: TraktShow, 
  seasons?: TraktSeason[]
): Promise<number | undefined> {
  try {
    // Calculate end year for ALL shows based on last aired episode
    // This gives us accurate year ranges for both ended and ongoing shows
    // Example: "Loot" (2022 - 2024) even though it's still "returning series"
    
    // Reuse seasons if provided, otherwise fetch them
    const showSeasons = seasons || await getShowSeasons(traktShow.ids.trakt);
    
    if (showSeasons.length === 0) {
      return undefined;
    }
    
    const lastSeason = showSeasons[showSeasons.length - 1];
    const episodes = await getSeasonEpisodes(traktShow.ids.trakt, lastSeason.number);
    
    const airedEpisodes = episodes.filter(ep => ep.first_aired);
    
    if (airedEpisodes.length === 0) {
      return undefined;
    }
    
    const lastEpisode = airedEpisodes[airedEpisodes.length - 1];
    const endYear = new Date(lastEpisode.first_aired!).getFullYear();
    
    // Only return endYear if it's different from the start year
    // This prevents "2022 - 2022" and shows just "2022" instead
    if (endYear === traktShow.year) {
      return undefined;
    }
    
    return endYear;
  } catch (error) {
    console.error('❌ Error fetching show end year:', error);
    return undefined;
  }
}

export interface GetShowsByGenreOptions {
  page?: number;
  limit?: number;
}

export interface GetShowsByGenreResponse {
  shows: TraktShow[];
  pagination: {
    page: number;
    limit: number;
    pageCount: number | null;
  };
}

export async function getShowsByGenre(
  genreSlug: string,
  options: GetShowsByGenreOptions = {}
): Promise<GetShowsByGenreResponse> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured. Please check your environment setup.');
  }

  const { page = 1, limit = 20 } = options;

  try {
    console.log(`🎭 Fetching ${genreSlug} shows from Trakt (page ${page}, limit ${limit})`);
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/popular?genres=${genreSlug}&extended=full&page=${page}&limit=${limit}`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `Trakt API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const shows: TraktShow[] = await response.json();
    
    const pagination = {
      page: parseInt(response.headers.get('X-Pagination-Page') || '1'),
      limit: parseInt(response.headers.get('X-Pagination-Limit') || String(limit)),
      pageCount: response.headers.get('X-Pagination-Page-Count') 
        ? parseInt(response.headers.get('X-Pagination-Page-Count')!)
        : null,
    };
    
    console.log(`✅ Found ${shows.length} ${genreSlug} shows on page ${pagination.page}${pagination.pageCount ? ` of ${pagination.pageCount}` : ''}`);
    
    return { shows, pagination };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error fetching shows by genre';
    console.error(`❌ Error fetching ${genreSlug} shows from Trakt:`, errorMsg);
    throw new Error(errorMsg);
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
    const errorMsg = error instanceof Error ? error.message : 'Unknown error fetching all episodes';
    console.error('❌ Error fetching all episodes from Trakt:', errorMsg);
    throw error;
  }
}

export interface TraktPaginationInfo {
  page: number;
  limit: number;
  pageCount: number;
  itemCount?: number;
}

export interface TraktPaginatedResponse<T> {
  data: T[];
  pagination: TraktPaginationInfo;
}

export async function getTrendingShows(limit: number = 12, page: number = 1): Promise<TraktPaginatedResponse<TraktShow>> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured');
  }

  try {
    console.log(`🔥 Fetching ${limit} trending shows from Trakt (page ${page})`);
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/trending?extended=full&limit=${limit}&page=${page}`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    // Extract pagination headers
    const pagination: TraktPaginationInfo = {
      page: parseInt(response.headers.get('X-Pagination-Page') || page.toString(), 10),
      limit: parseInt(response.headers.get('X-Pagination-Limit') || limit.toString(), 10),
      pageCount: parseInt(response.headers.get('X-Pagination-Page-Count') || '1', 10),
      itemCount: parseInt(response.headers.get('X-Pagination-Item-Count') || '0', 10),
    };

    const responseData: { watchers: number; show: TraktShow }[] = await response.json();
    const shows = responseData.map(item => item.show);
    
    console.log(`✅ Fetched ${shows.length} trending shows (page ${pagination.page}/${pagination.pageCount})`);
    return { data: shows, pagination };
  } catch (error) {
    console.error('Error fetching trending shows from Trakt:', error);
    throw error;
  }
}

export async function getRecentlyReleasedShows(limit: number = 12): Promise<TraktShow[]> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured');
  }

  try {
    console.log(`📅 Fetching ${limit} recently released shows from Trakt`);
    
    // Get recently aired shows from Trakt
    const response = await fetch(
      `${TRAKT_BASE_URL}/calendars/all/shows/new/-30/${limit}?extended=full`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    const data: { first_aired: string; show: TraktShow }[] = await response.json();
    
    // Sort by first_aired date (most recent first) and extract shows
    const shows = data
      .sort((a, b) => new Date(b.first_aired).getTime() - new Date(a.first_aired).getTime())
      .map(item => item.show)
      .slice(0, limit);
    
    console.log(`✅ Fetched ${shows.length} recently released shows`);
    return shows;
  } catch (error) {
    console.error('Error fetching recently released shows from Trakt:', error);
    throw error;
  }
}

export async function getPopularShowsByGenre(genre: string, limit: number = 12): Promise<TraktShow[]> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured');
  }

  try {
    console.log(`📺 Fetching ${limit} popular shows for genre: ${genre}`);
    
    // Get popular shows from Trakt
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/popular?extended=full&limit=${limit * 3}`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    const allShows: TraktShow[] = await response.json();
    
    // Filter by genre (case-insensitive)
    const genreLower = genre.toLowerCase();
    const filteredShows = allShows.filter(show => 
      show.genres && show.genres.some(g => g.toLowerCase() === genreLower)
    );
    
    const shows = filteredShows.slice(0, limit);
    console.log(`✅ Fetched ${shows.length} popular ${genre} shows`);
    return shows;
  } catch (error) {
    console.error(`Error fetching popular shows for genre ${genre} from Trakt:`, error);
    throw error;
  }
}

export async function getRelatedShows(showId: number | string, limit: number = 12): Promise<TraktShow[]> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured');
  }

  try {
    console.log(`🔗 Fetching ${limit} related shows for show ID: ${showId}`);
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/${showId}/related?extended=full&limit=${limit}`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    const shows: TraktShow[] = await response.json();
    console.log(`✅ Fetched ${shows.length} related shows`);
    return shows;
  } catch (error) {
    console.error(`Error fetching related shows for ${showId} from Trakt:`, error);
    throw error;
  }
}

export async function getPlayedShows(period: string = 'monthly', limit: number = 12, page: number = 1): Promise<TraktPaginatedResponse<TraktShow>> {
  if (!TRAKT_CLIENT_ID) {
    console.error('❌ Trakt API credentials not configured');
    throw new Error('Trakt API credentials not configured');
  }

  try {
    console.log(`🔁 Fetching ${limit} most played shows (${period}, page ${page})`);
    const response = await fetch(
      `${TRAKT_BASE_URL}/shows/played/${period}?extended=full&limit=${limit}&page=${page}`,
      { headers: TRAKT_HEADERS }
    );

    if (!response.ok) {
      throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
    }

    // Extract pagination headers
    const pagination: TraktPaginationInfo = {
      page: parseInt(response.headers.get('X-Pagination-Page') || page.toString(), 10),
      limit: parseInt(response.headers.get('X-Pagination-Limit') || limit.toString(), 10),
      pageCount: parseInt(response.headers.get('X-Pagination-Page-Count') || '1', 10),
      itemCount: parseInt(response.headers.get('X-Pagination-Item-Count') || '0', 10),
    };

    const responseData: { watcher_count: number; play_count: number; collected_count: number; show: TraktShow }[] = await response.json();
    const shows = responseData.map(item => item.show);
    
    console.log(`✅ Fetched ${shows.length} most played shows (page ${pagination.page}/${pagination.pageCount})`);
    return { data: shows, pagination };
  } catch (error) {
    console.error(`Error fetching played shows from Trakt:`, error);
    throw error;
  }
}
