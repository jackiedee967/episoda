import { Show, Episode } from '@/types';
import { TraktShow, TraktEpisode } from './trakt';
import { DatabaseShow, DatabaseEpisode } from './showDatabase';

export interface ShowOverrides {
  posterUrl?: string | null;
  totalSeasons?: number;
  totalEpisodes?: number;
}

/**
 * Calculate end year from Trakt show data
 * For ended/canceled shows, estimate end year from first_aired date and episode count
 */
function calculateEndYear(traktShow: TraktShow): number | undefined {
  // If show is still airing, no end year
  if (traktShow.status === 'returning series' || traktShow.status === 'in production') {
    return undefined;
  }
  
  // If show ended/canceled, try to estimate end year
  if (traktShow.status === 'ended' || traktShow.status === 'canceled') {
    // If we have first_aired date and episode count, estimate
    if (traktShow.first_aired && traktShow.aired_episodes) {
      const startYear = new Date(traktShow.first_aired).getFullYear();
      // Most TV shows run ~12 episodes per season, with ~1 season per year
      // For long-running shows (>50 episodes), assume they ran for multiple years
      const estimatedSeasons = Math.ceil(traktShow.aired_episodes / 12);
      // Add years (minus 1 since first year is already counted)
      const endYear = startYear + Math.max(0, estimatedSeasons - 1);
      
      console.log(`📅 Year Range: ${traktShow.title} (${traktShow.status}) - ${traktShow.aired_episodes} eps → ${startYear}-${endYear}`);
      
      // Only return endYear if it's different from startYear
      return endYear > startYear ? endYear : undefined;
    }
  }
  
  console.log(`⚠️ No year range for ${traktShow.title}: status=${traktShow.status}, first_aired=${traktShow.first_aired}, episodes=${traktShow.aired_episodes}`);
  return undefined;
}

export function mapTraktShowToShow(
  traktShow: TraktShow, 
  overrides: ShowOverrides = {}
): Show {
  const endYear = calculateEndYear(traktShow);
  
  return {
    id: `trakt-${traktShow.ids.trakt}`,
    traktId: traktShow.ids.trakt,
    title: traktShow.title,
    year: traktShow.year,
    endYear: endYear,
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
  // Calculate endYear from database show data if available
  // Since we don't have status in DB, calculate for all shows with 50+ episodes
  let endYear: number | undefined = undefined;
  if (dbShow.year && dbShow.total_episodes && dbShow.total_episodes >= 50) {
    const estimatedSeasons = Math.ceil(dbShow.total_episodes / 12);
    const calculatedEndYear = dbShow.year + Math.max(0, estimatedSeasons - 1);
    endYear = calculatedEndYear > dbShow.year ? calculatedEndYear : undefined;
    
    if (endYear) {
      console.log(`📅 DB Show Year Range: ${dbShow.title} - ${dbShow.total_episodes} eps → ${dbShow.year}-${endYear}`);
    }
  }
  
  return {
    id: dbShow.id,
    traktId: dbShow.trakt_id,
    title: dbShow.title,
    year: dbShow.year || undefined,
    endYear: endYear,
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
