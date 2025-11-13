const API_BASE_URL = '/api/trakt';

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
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?query=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data: TraktSearchResult[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching shows:', error);
    throw error;
  }
}

export async function getShowDetails(traktId: number | string): Promise<TraktShow> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/show/${traktId}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data: TraktShow = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching show details:', error);
    throw error;
  }
}

export async function getShowSeasons(traktId: number | string): Promise<TraktSeason[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/show/${traktId}/seasons`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data: TraktSeason[] = await response.json();
    return data.filter(season => season.number > 0);
  } catch (error) {
    console.error('Error fetching show seasons:', error);
    throw error;
  }
}

export async function getSeasonEpisodes(
  traktId: number | string,
  seasonNumber: number
): Promise<TraktEpisode[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/show/${traktId}/episodes?season=${seasonNumber}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data: TraktEpisode[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching season episodes:', error);
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
