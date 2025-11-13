import { Show, Episode } from '@/types';
import { TraktShow, TraktEpisode } from './trakt';
import { DatabaseShow, DatabaseEpisode } from './showDatabase';

export interface ShowOverrides {
  posterUrl?: string | null;
  totalSeasons?: number;
  totalEpisodes?: number;
}

export function mapTraktShowToShow(
  traktShow: TraktShow, 
  overrides: ShowOverrides = {}
): Show {
  return {
    id: `trakt-${traktShow.ids.trakt}`,
    title: traktShow.title,
    poster: overrides.posterUrl || '',
    description: traktShow.overview || '',
    rating: traktShow.rating || 0,
    totalSeasons: overrides.totalSeasons ?? 0,
    totalEpisodes: overrides.totalEpisodes ?? traktShow.aired_episodes ?? 0,
    friendsWatching: 0,
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
    title: dbShow.title,
    poster: dbShow.poster_url || '',
    description: dbShow.description || '',
    rating: dbShow.rating || 0,
    totalSeasons: dbShow.total_seasons || 0,
    totalEpisodes: dbShow.total_episodes || 0,
    friendsWatching: 0,
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
