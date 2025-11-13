import Constants from 'expo-constants';

const getOMDBApiKey = () => {
  const key = 
    Constants.expoConfig?.extra?.omdbApiKey ||
    Constants.manifest?.extra?.omdbApiKey ||
    Constants.manifest2?.extra?.expoClient?.extra?.omdbApiKey ||
    process.env.OMDB_API_KEY ||
    '';
  
  if (!key) {
    console.warn('⚠️ OMDB API key not configured. Poster enrichment will be limited to TVMaze.');
    console.log('Constants available:', {
      hasExpoConfig: !!Constants.expoConfig,
      hasManifest: !!Constants.manifest,
      hasManifest2: !!Constants.manifest2,
      expoConfigExtra: Constants.expoConfig?.extra,
      manifestExtra: Constants.manifest?.extra,
    });
  } else {
    console.log('✅ OMDB API key loaded successfully (length:', key.length, ')');
  }
  
  return key;
};

const OMDB_API_KEY = getOMDBApiKey();
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

export interface OMDBSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

export interface OMDBDetailedResult {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{
    Source: string;
    Value: string;
  }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  totalSeasons?: string;
  Response: string;
  Error?: string;
}

export async function searchOMDB(query: string): Promise<OMDBSearchResult[]> {
  if (!OMDB_API_KEY) {
    console.error('❌ OMDB API key not configured');
    return [];
  }

  try {
    const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=series`;
    console.log('🔍 OMDB Search:', query);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True' && data.Search) {
      console.log(`✅ OMDB found ${data.Search.length} results for: ${query}`);
      return data.Search;
    } else {
      console.log(`⚠️ OMDB no results for: ${query}`, data.Error || '');
      return [];
    }
  } catch (error) {
    console.error('❌ OMDB search error:', error);
    return [];
  }
}

export async function getOMDBDetails(imdbId: string): Promise<OMDBDetailedResult | null> {
  if (!OMDB_API_KEY) {
    console.error('❌ OMDB API key not configured');
    return null;
  }

  try {
    const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`;
    console.log('🔍 OMDB Details for:', imdbId);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      console.log(`✅ OMDB details loaded for: ${data.Title}`);
      return data;
    } else {
      console.log(`⚠️ OMDB details not found for: ${imdbId}`, data.Error || '');
      return null;
    }
  } catch (error) {
    console.error('❌ OMDB details error:', error);
    return null;
  }
}

export async function getOMDBPoster(imdbId: string, height?: number): Promise<string | null> {
  if (!OMDB_API_KEY) {
    console.error('❌ OMDB API key not configured');
    return null;
  }

  try {
    const heightParam = height ? `&h=${height}` : '';
    const url = `http://img.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}${heightParam}`;
    console.log('🖼️  OMDB Poster for:', imdbId);
    
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log(`✅ OMDB poster available for: ${imdbId}`);
      return url;
    } else {
      console.log(`⚠️ OMDB poster not found for: ${imdbId}`);
      return null;
    }
  } catch (error) {
    console.error('❌ OMDB poster error:', error);
    return null;
  }
}

export async function getOMDBByTitle(title: string, year?: string): Promise<OMDBDetailedResult | null> {
  if (!OMDB_API_KEY) {
    console.error('❌ OMDB API key not configured');
    return null;
  }

  try {
    const yearParam = year ? `&y=${year}` : '';
    const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&type=series${yearParam}`;
    console.log('🔍 OMDB Title search:', title, year || '');
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      console.log(`✅ OMDB found: ${data.Title} (${data.imdbID})`);
      return data;
    } else {
      console.log(`⚠️ OMDB title not found: ${title}`, data.Error || '');
      return null;
    }
  } catch (error) {
    console.error('❌ OMDB title search error:', error);
    return null;
  }
}
