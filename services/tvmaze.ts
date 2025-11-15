const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

export interface TVMazeShow {
  id: number;
  name: string;
  image?: {
    medium: string;
    original: string;
  };
  summary?: string;
  externals: {
    tvrage: number | null;
    thetvdb: number | null;
    imdb: string | null;
  };
}

export interface TVMazeEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  image?: {
    medium: string;
    original: string;
  };
  summary?: string;
}

export interface TVMazeImage {
  id: number;
  type: 'poster' | 'banner' | 'background' | 'typography' | null;
  main: boolean;
  resolutions: {
    original: {
      url: string;
      width: number;
      height: number;
    };
    medium?: {
      url: string;
      width: number;
      height: number;
    };
  };
}

export async function getShowByImdbId(imdbId: string): Promise<TVMazeShow | null> {
  try {
    console.log(`🔍 TVMaze lookup by IMDb: ${imdbId}`);
    const response = await fetch(
      `${TVMAZE_BASE_URL}/lookup/shows?imdb=${imdbId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ TVMaze: No show for IMDb ${imdbId}`);
        return null;
      }
      throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`);
    }

    const data: TVMazeShow = await response.json();
    console.log(`✅ TVMaze found: ${data.name}, poster: ${!!data.image}`);
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ TVMaze IMDb error for ${imdbId}:`, errorMsg);
    return null;
  }
}

export async function getShowByTvdbId(tvdbId: number): Promise<TVMazeShow | null> {
  try {
    console.log(`🔍 TVMaze lookup by TVDB: ${tvdbId}`);
    const response = await fetch(
      `${TVMAZE_BASE_URL}/lookup/shows?thetvdb=${tvdbId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ TVMaze: No show for TVDB ${tvdbId}`);
        return null;
      }
      throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`);
    }

    const data: TVMazeShow = await response.json();
    console.log(`✅ TVMaze found: ${data.name}, poster: ${!!data.image}`);
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ TVMaze TVDB error for ${tvdbId}:`, errorMsg);
    return null;
  }
}

export async function searchShowByName(showName: string): Promise<TVMazeShow | null> {
  try {
    console.log(`🔍 TVMaze search by name: "${showName}"`);
    const response = await fetch(
      `${TVMAZE_BASE_URL}/singlesearch/shows?q=${encodeURIComponent(showName)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ TVMaze: No results for "${showName}"`);
        return null;
      }
      throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`);
    }

    const data: TVMazeShow = await response.json();
    console.log(`✅ TVMaze search found: ${data.name}, poster: ${!!data.image}`);
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ TVMaze search error for "${showName}":`, errorMsg);
    return null;
  }
}

export async function getShowImages(tvmazeId: number): Promise<TVMazeImage[]> {
  try {
    const response = await fetch(
      `${TVMAZE_BASE_URL}/shows/${tvmazeId}/images`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`);
    }

    const data: TVMazeImage[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching show images from TVMaze:', error);
    return [];
  }
}

export async function getBackdropUrl(tvmazeId: number): Promise<string | null> {
  try {
    const images = await getShowImages(tvmazeId);
    const backgrounds = images.filter(img => img.type === 'background');
    
    if (backgrounds.length === 0) {
      return null;
    }

    const mainBackground = backgrounds.find(bg => bg.main);
    const backdrop = mainBackground || backgrounds[0];
    
    return backdrop.resolutions.original.url;
  } catch (error) {
    console.error('Error fetching backdrop from TVMaze:', error);
    return null;
  }
}

export async function getEpisode(
  tvmazeShowId: number,
  season: number,
  episode: number
): Promise<TVMazeEpisode | null> {
  try {
    const response = await fetch(
      `${TVMAZE_BASE_URL}/shows/${tvmazeShowId}/episodebynumber?season=${season}&number=${episode}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`);
    }

    const data: TVMazeEpisode = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching episode from TVMaze:', error);
    return null;
  }
}

export async function getPosterUrl(imdbId: string | null, tvdbId: number | null): Promise<string | null> {
  if (!imdbId && !tvdbId) {
    return null;
  }

  let show: TVMazeShow | null = null;

  if (imdbId) {
    show = await getShowByImdbId(imdbId);
  }

  if (!show && tvdbId) {
    show = await getShowByTvdbId(tvdbId);
  }

  if (!show || !show.image) {
    return null;
  }

  return show.image.original;
}

export async function getEpisodeThumbnail(
  imdbId: string | null,
  tvdbId: number | null,
  season: number,
  episodeNumber: number
): Promise<string | null> {
  if (!imdbId && !tvdbId) {
    return null;
  }

  let show: TVMazeShow | null = null;

  if (imdbId) {
    show = await getShowByImdbId(imdbId);
  }

  if (!show && tvdbId) {
    show = await getShowByTvdbId(tvdbId);
  }

  if (!show) {
    return null;
  }

  const episode = await getEpisode(show.id, season, episodeNumber);
  
  if (!episode || !episode.image) {
    return null;
  }

  return episode.image.original;
}
