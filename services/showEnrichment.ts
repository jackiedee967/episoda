import { TraktShow, getShowSeasons } from './trakt';
import { getShowByImdbId, getShowByTvdbId, searchShowByName, TVMazeShow } from './tvmaze';
import { getOMDBByTitle } from './omdb';

export interface EnrichedShowData {
  totalSeasons: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  tvmazeId: number | null;
  imdbId: string | null;
  isEnriched: boolean;
}

class ShowEnrichmentManager {
  private cache: Map<number, EnrichedShowData> = new Map();
  private pendingRequests: Map<number, Promise<EnrichedShowData>> = new Map();
  private readonly MAX_CONCURRENT = 4;
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
      console.log(`🎬 Enriching: ${traktShow.title}, IMDb: ${traktShow.ids.imdb || 'N/A'}, TVDB: ${traktShow.ids.tvdb || 'N/A'}`);
      
      const [seasons, omdbData] = await Promise.all([
        this.fetchSeasons(traktShow.ids.trakt),
        this.fetchOMDBData(traktShow.title, traktShow.year),
      ]);

      const omdbImdbId = omdbData?.imdbId || null;
      const imdbId = omdbImdbId || traktShow.ids.imdb || null;
      let posterUrl = omdbData?.posterUrl || null;
      console.log(`  OMDB poster: ${posterUrl ? 'Yes' : 'No'}`);

      let tvmazeData = null;
      if (!posterUrl) {
        console.log(`  Trying TVMaze fallback...`);
        tvmazeData = await this.fetchTVMazeData(imdbId, traktShow.ids.tvdb, traktShow.title);
        posterUrl = tvmazeData?.posterUrl || null;
        console.log(`  TVMaze poster: ${posterUrl ? 'Yes' : 'No'}`);
      }

      let backdropUrl = null;
      if (tvmazeData?.tvmazeId) {
        backdropUrl = await this.fetchBackdropUrl(tvmazeData.tvmazeId);
      } else if (!posterUrl && traktShow.ids.tvdb) {
        const tvmazeShow = await this.fetchTVMazeByTvdb(traktShow.ids.tvdb);
        if (tvmazeShow) {
          backdropUrl = await this.fetchBackdropUrl(tvmazeShow.tvmazeId);
          if (!posterUrl) {
            posterUrl = tvmazeShow.posterUrl;
          }
        }
      }

      console.log(`✅ Enriched ${traktShow.title}: Poster=${!!posterUrl}, Backdrop=${!!backdropUrl}`);

      const enriched = {
        totalSeasons: seasons,
        posterUrl,
        backdropUrl,
        tvmazeId: tvmazeData?.tvmazeId || null,
        imdbId,
        isEnriched: true,
      };
      
      return enriched;
    } catch (error) {
      console.error(`Error enriching show ${traktShow.title}:`, error);
      throw error;
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private async fetchSeasons(traktId: number): Promise<number> {
    const seasons = await getShowSeasons(traktId);
    return seasons.filter(s => s.number > 0).length;
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
