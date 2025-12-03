import { TraktShow, getShowSeasons, fetchShowEndYear } from './trakt';
import { getShowByImdbId, getShowByTvdbId, searchShowByName, TVMazeShow, getBackdropUrl as getTVMazeBackdropUrl } from './tvmaze';
import { getOMDBByTitle } from './omdb';
import { searchShowByName as searchTMDB, getPosterUrl as getTMDBPosterUrl, getBackdropUrl as getTMDBBackdropUrl, getShowKeywords } from './tmdb';

export interface EnrichedShowData {
  totalSeasons: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  tvmazeId: number | null;
  imdbId: string | null;
  tmdbId: number | null;
  keywords: string[];
  endYear: number | undefined;
  isEnriched: boolean;
}

class ShowEnrichmentManager {
  private cache: Map<number, EnrichedShowData> = new Map();
  private pendingRequests: Map<number, Promise<EnrichedShowData>> = new Map();
  private readonly MAX_CONCURRENT = 50; // Allow massive parallelization for instant loading
  private activeRequests = 0;
  private queue: Array<{ traktId: number; resolve: () => void }> = [];

  async enrichShow(traktShow: TraktShow): Promise<EnrichedShowData> {
    const traktId = traktShow.ids.trakt;

    if (this.cache.has(traktId)) {
      return this.cache.get(traktId)!;
    }

    if (this.pendingRequests.has(traktId)) {
      return this.pendingRequests.get(traktId)!;
    }

    const promise = this.performEnrichment(traktShow);
    this.pendingRequests.set(traktId, promise);

    try {
      const result = await promise;
      this.cache.set(traktId, result);
      return result;
    } finally {
      this.pendingRequests.delete(traktId);
    }
  }

  private async performEnrichment(traktShow: TraktShow): Promise<EnrichedShowData> {
    if (this.activeRequests >= this.MAX_CONCURRENT) {
      await new Promise<void>((resolve) => {
        this.queue.push({ traktId: traktShow.ids.trakt, resolve: () => resolve() });
      });
    }

    this.activeRequests++;

    try {
      // PARALLEL: Fetch from all sources simultaneously for speed
      const [tmdbResult, omdbResult, tvmazeResult, seasonsResult] = await Promise.allSettled([
        this.fetchTMDBData(traktShow.title, traktShow.year),
        this.fetchOMDBData(traktShow.title, traktShow.year),
        this.fetchTVMazeData(traktShow.ids.imdb || null, traktShow.ids.tvdb, traktShow.title),
        getShowSeasons(traktShow.ids.trakt),
      ]);

      // Extract results (use null for rejected promises)
      const tmdbData = tmdbResult.status === 'fulfilled' ? tmdbResult.value : null;
      const omdbData = omdbResult.status === 'fulfilled' ? omdbResult.value : null;
      const tvmazeData = tvmazeResult.status === 'fulfilled' ? tvmazeResult.value : null;
      const seasons = seasonsResult.status === 'fulfilled' ? seasonsResult.value : [];

      // Multi-tier poster fallback: TMDB > OMDB > TVMaze
      let posterUrl: string | null = tmdbData?.posterUrl || omdbData?.posterUrl || tvmazeData?.posterUrl || null;
      let backdropUrl: string | null = tmdbData?.backdropUrl || null;
      let imdbId: string | null = traktShow.ids.imdb || omdbData?.imdbId || null;
      let tmdbId: number | null = tmdbData?.tmdbId || null;
      let keywords: string[] = tmdbData?.keywords || [];

      // Calculate seasons and end year
      const totalSeasons = seasons.filter(s => s.number > 0).length;
      const endYear = await fetchShowEndYear(traktShow, seasons);

      const enriched = {
        totalSeasons,
        posterUrl,
        backdropUrl,
        tvmazeId: tvmazeData?.tvmazeId || null,
        imdbId,
        tmdbId,
        keywords,
        endYear,
        isEnriched: !!posterUrl,
      };
      
      return enriched;
    } catch (error) {
      console.error(`❌ ENRICHMENT ERROR for ${traktShow.title}:`, error);
      return {
        totalSeasons: 0,
        posterUrl: null,
        backdropUrl: null,
        tvmazeId: null,
        imdbId: traktShow.ids.imdb || null,
        tmdbId: null,
        keywords: [],
        endYear: undefined,
        isEnriched: false,
      };
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private async fetchSeasons(traktId: number): Promise<number> {
    const seasons = await getShowSeasons(traktId);
    return seasons.filter(s => s.number > 0).length;
  }

  private async fetchTMDBData(title: string, year: number | null): Promise<{ posterUrl: string | null; backdropUrl: string | null; tmdbId: number | null; keywords: string[] } | null> {
    const tmdbResult = await searchTMDB(title, year);
    
    if (!tmdbResult) {
      return null;
    }
    
    const tmdbId = tmdbResult.id;
    
    // Fetch keywords in background - don't block on it
    let keywords: string[] = [];
    try {
      keywords = await getShowKeywords(tmdbId);
    } catch {
      // Non-critical - continue without keywords
    }
    
    return {
      posterUrl: tmdbResult.poster_path ? getTMDBPosterUrl(tmdbResult.poster_path) : null,
      backdropUrl: tmdbResult.backdrop_path ? getTMDBBackdropUrl(tmdbResult.backdrop_path) : null,
      tmdbId,
      keywords,
    };
  }

  private async fetchOMDBData(title: string, year: number | null): Promise<{ posterUrl: string | null; imdbId: string | null } | null> {
    const yearStr = year?.toString();
    const omdbResult = await getOMDBByTitle(title, yearStr);

    if (!omdbResult) {
      return null;
    }

    return {
      posterUrl: (omdbResult.Poster && omdbResult.Poster !== 'N/A') ? omdbResult.Poster : null,
      imdbId: omdbResult.imdbID || null,
    };
  }

  private async fetchTVMazeData(imdbId: string | null, tvdbId: number | null, showTitle?: string): Promise<{ posterUrl: string; tvmazeId: number } | null> {
    let tvmazeShow: TVMazeShow | null = null;

    if (imdbId) {
      tvmazeShow = await getShowByImdbId(imdbId);
    }

    if (!tvmazeShow && tvdbId) {
      tvmazeShow = await getShowByTvdbId(tvdbId);
    }

    // Fallback: search by title if no IDs worked
    if (!tvmazeShow && showTitle) {
      console.log(`  No IDs available, trying title search...`);
      tvmazeShow = await searchShowByName(showTitle);
    }

    if (!tvmazeShow || !tvmazeShow.image) {
      return null;
    }

    return {
      posterUrl: tvmazeShow.image.original,
      tvmazeId: tvmazeShow.id,
    };
  }

  private async fetchTVMazeByTvdb(tvdbId: number): Promise<{ posterUrl: string; tvmazeId: number } | null> {
    const tvmazeShow = await getShowByTvdbId(tvdbId);
    
    if (!tvmazeShow || !tvmazeShow.image) {
      return null;
    }

    return {
      posterUrl: tvmazeShow.image.original,
      tvmazeId: tvmazeShow.id,
    };
  }

  private async fetchBackdropUrl(tvmazeId: number): Promise<string | null> {
    const { getBackdropUrl } = await import('./tvmaze');
    return await getBackdropUrl(tvmazeId);
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeRequests < this.MAX_CONCURRENT) {
      const next = this.queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  clearCache() {
    this.cache.clear();
  }

  getCachedData(traktId: number): EnrichedShowData | null {
    return this.cache.get(traktId) || null;
  }
}

export const showEnrichmentManager = new ShowEnrichmentManager();
