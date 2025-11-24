import { Show, Episode } from '@/types';
import { TraktShow, TraktEpisode } from './trakt';
import { DatabaseShow, DatabaseEpisode } from './showDatabase';

export interface ShowOverrides {
  posterUrl?: string | null;
  totalSeasons?: number;
  totalEpisodes?: number;
  endYear?: number;
}

export function mapTraktShowToShow(
  traktShow: TraktShow, 
  overrides: ShowOverrides = {}
): Show {
  return {
    id: `trakt-${traktShow.ids.trakt}`,
    traktId: traktShow.ids.trakt,
    title: traktShow.title,
    year: traktShow.year,
    endYear: overrides.endYear ?? traktShow.end_year,
    poster: overrides.posterUrl ?? null,
    description: traktShow.overview || '',
    rating: traktShow.rating || 0,
    totalSeasons: overrides.totalSeasons ?? 0,
    totalEpisodes: overrides.totalEpisodes ?? traktShow.aired_episodes ?? 0,
    friendsWatching: 0,
    colorScheme: null,
  };
}

export function mapTraktEpisodeToEpisode(
  traktEpisode: TraktEpisode,
  showId: string,
  thumbnailUrl: string | null = null
): Episode {
  return {
    id: `trakt-${traktEpisode.ids.trakt}`,
    showId: showId,
    seasonNumber: traktEpisode.season,
    episodeNumber: traktEpisode.number,
    title: traktEpisode.title,
    description: traktEpisode.overview || '',
    rating: traktEpisode.rating || 0,
    postCount: 0,
    thumbnail: thumbnailUrl || undefined,
  };
}

export function mapDatabaseShowToShow(dbShow: DatabaseShow): Show {
  return {
    id: dbShow.id,
    traktId: dbShow.trakt_id,
    title: dbShow.title,
    year: dbShow.year || undefined,
    endYear: undefined, // Year ranges disabled - heuristic calculation was inaccurate
    poster: dbShow.poster_url ?? null,
    description: dbShow.description || '',
    rating: dbShow.rating || 0,
    totalSeasons: dbShow.total_seasons || 0,
    totalEpisodes: dbShow.total_episodes || 0,
    friendsWatching: 0,
    colorScheme: dbShow.color_scheme ?? null,
  };
}

export function mapDatabaseEpisodeToEpisode(dbEpisode: DatabaseEpisode): Episode {
  return {
    id: dbEpisode.id,
    showId: dbEpisode.show_id,
    seasonNumber: dbEpisode.season_number,
    episodeNumber: dbEpisode.episode_number,
    title: dbEpisode.title,
    description: dbEpisode.description || '',
    rating: dbEpisode.rating || 0,
    postCount: 0,
    thumbnail: dbEpisode.thumbnail_url || undefined,
  };
}

export function mapDatabaseShowToTraktShow(dbShow: DatabaseShow): TraktShow {
  return {
    title: dbShow.title,
    year: dbShow.year || 0,
    ids: {
      trakt: dbShow.trakt_id,
      slug: '',
      tvdb: null,
      imdb: dbShow.imdb_id || null,
      tmdb: dbShow.tmdb_id || null
    },
    overview: dbShow.description || undefined,
    first_aired: undefined,
    runtime: undefined,
    network: undefined,
    country: undefined,
    status: undefined,
    rating: dbShow.rating || 0,
    votes: undefined,
    language: undefined,
    genres: dbShow.genres || [],
    aired_episodes: dbShow.total_episodes || undefined
  };
}
