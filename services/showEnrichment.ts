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
      // Multi-tier poster fallback for 99% coverage
      let posterUrl: string | null = null;
      let backdropUrl: string | null = null;
      let imdbId: string | null = traktShow.ids.imdb || null;
      let tmdbId: number | null = null;
      let keywords: string[] = [];
      
      // Tier 1: TMDB (best coverage for both posters and backdrops)
      const tmdbData = await this.fetchTMDBData(traktShow.title, traktShow.year);
      posterUrl = tmdbData?.posterUrl || null;
      backdropUrl = tmdbData?.backdropUrl || null;
      tmdbId = tmdbData?.tmdbId || null;
      keywords = tmdbData?.keywords || [];
      
      // Tier 2: OMDB (high quality posters)
      if (!posterUrl) {
        const omdbData = await this.fetchOMDBData(traktShow.title, traktShow.year);
        posterUrl = omdbData?.posterUrl || null;
        if (omdbData?.imdbId) {
          imdbId = omdbData.imdbId;
        }
      }

      // Tier 3: TVMaze (ID-based + title search fallback)
      if (!posterUrl) {
        const tvmazeData = await this.fetchTVMazeData(imdbId, traktShow.ids.tvdb, traktShow.title);
        posterUrl = tvmazeData?.posterUrl || null;
      }

      // Fetch seasons once and reuse for both totalSeasons and endYear
      const seasons = await getShowSeasons(traktShow.ids.trakt);
      const totalSeasons = seasons.filter(s => s.number > 0).length;
      const endYear = await fetchShowEndYear(traktShow, seasons);

      const enriched = {
        totalSeasons,
        posterUrl,
        backdropUrl, // TMDB backdrop for ShowHub headers
        tvmazeId: null,
        imdbId,
        tmdbId,
        keywords,
        endYear,
        isEnriched: !!posterUrl,
      };
      
      return enriched;
    } catch (error) {
      console.error(`❌ ENRICHMENT ERROR for ${traktShow.title}:`, error);
      // Return partial data instead of throwing
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
    const keywords = await getShowKeywords(tmdbId);
    
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
