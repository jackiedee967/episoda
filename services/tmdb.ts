const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export interface TMDBShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  overview: string;
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
