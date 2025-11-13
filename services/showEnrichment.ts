import { TraktShow, getShowSeasons } from './trakt';
import { getShowByImdbId, getShowByTvdbId, TVMazeShow } from './tvmaze';

export interface EnrichedShowData {
  totalSeasons: number;
  posterUrl: string | null;
  tvmazeId: number | null;
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
      const [seasons, tvmazeData] = await Promise.all([
        this.fetchSeasons(traktShow.ids.trakt),
        this.fetchTVMazeData(traktShow.ids.imdb, traktShow.ids.tvdb),
      ]);

      const enriched = {
        totalSeasons: seasons,
        posterUrl: tvmazeData?.posterUrl || null,
        tvmazeId: tvmazeData?.tvmazeId || null,
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

  private async fetchTVMazeData(imdbId: string | null, tvdbId: number | null): Promise<{ posterUrl: string; tvmazeId: number } | null> {
    if (!imdbId && !tvdbId) {
      return null;
    }

    let tvmazeShow: TVMazeShow | null = null;

    if (imdbId) {
      tvmazeShow = await getShowByImdbId(imdbId);
    }

    if (!tvmazeShow && tvdbId) {
      tvmazeShow = await getShowByTvdbId(tvdbId);
    }

    if (!tvmazeShow || !tvmazeShow.image) {
      return null;
    }

    return {
      posterUrl: tvmazeShow.image.original,
      tvmazeId: tvmazeShow.id,
    };
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
