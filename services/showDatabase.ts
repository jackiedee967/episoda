import { supabase } from '@/integrations/supabase/client';
import { TraktShow, TraktEpisode } from './trakt';
import { getPosterUrl, getEpisodeThumbnail } from './tvmaze';
import { assignColorToShow } from '@/utils/showColors';

export interface DatabaseShow {
  id: string;
  trakt_id: number;
  imdb_id: string | null;
  tvdb_id: number | null;
  tmdb_id: number | null;
  tvmaze_id: number | null;
  title: string;
  year: number | null;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  total_seasons: number | null;
  total_episodes: number | null;
  color_scheme: string | null;
  genres?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseEpisode {
  id: string;
  show_id: string;
  trakt_id: number | null;
  imdb_id: string | null;
  tvdb_id: number | null;
  tmdb_id: number | null;
  season_number: number;
  episode_number: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  rating: number | null;
  created_at: string;
}

export interface SaveShowOptions {
  enrichedPosterUrl?: string | null;
  enrichedBackdropUrl?: string | null;
  enrichedSeasonCount?: number | null;
  enrichedTVMazeId?: number | null;
  enrichedImdbId?: string | null;
}

export async function saveShow(
  traktShow: TraktShow, 
  options: SaveShowOptions = {}
): Promise<DatabaseShow> {
  console.log('🔍 saveShow START:', traktShow.title);
  let tvmazeShow = null;
  let posterUrl = options.enrichedPosterUrl || null;
  let tvmazeId = options.enrichedTVMazeId || null;

  if (!tvmazeId || !posterUrl) {
    console.log('📡 Fetching TVMaze data...');
    if (traktShow.ids.imdb) {
      const { getShowByImdbId } = await import('./tvmaze');
      tvmazeShow = await getShowByImdbId(traktShow.ids.imdb);
    }

    if (!tvmazeShow && traktShow.ids.tvdb) {
      const { getShowByTvdbId } = await import('./tvmaze');
      tvmazeShow = await getShowByTvdbId(traktShow.ids.tvdb);
    }

    if (tvmazeShow) {
      tvmazeId = tvmazeId || tvmazeShow.id;
      posterUrl = posterUrl || tvmazeShow.image?.original || null;
    }
    console.log('✅ TVMaze fetch complete');
  }

  let backdropUrl = options.enrichedBackdropUrl || null;
  if (!backdropUrl && tvmazeId) {
    console.log('🖼️ Fetching backdrop...');
    const { getBackdropUrl } = await import('./tvmaze');
    backdropUrl = await getBackdropUrl(tvmazeId);
    console.log('✅ Backdrop fetch complete:', backdropUrl ? 'found' : 'none');
  }

  console.log('📦 Preparing show data...');
  
  const existingShow = await getShowByTraktId(traktShow.ids.trakt);
  const colorScheme = existingShow?.color_scheme || assignColorToShow(traktShow.ids.trakt);
  
  const showData = {
    trakt_id: traktShow.ids.trakt,
    imdb_id: options.enrichedImdbId || traktShow.ids.imdb,
    tvdb_id: traktShow.ids.tvdb,
    tmdb_id: traktShow.ids.tmdb,
    tvmaze_id: tvmazeId,
    title: traktShow.title,
    year: traktShow.year || null,
    description: traktShow.overview || null,
    poster_url: posterUrl,
    backdrop_url: backdropUrl,
    rating: traktShow.rating ? Number(traktShow.rating.toFixed(1)) : null,
    total_seasons: options.enrichedSeasonCount ?? null,
    total_episodes: traktShow.aired_episodes || null,
    color_scheme: colorScheme,
    genres: traktShow.genres || [],
    updated_at: new Date().toISOString(),
  };

  console.log('💾 Upserting to database...');
  const { data, error } = await supabase
    .from('shows')
    .upsert(showData, {
      onConflict: 'trakt_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Upsert error:', error);
    if (error.message?.includes('genres') || error.message?.includes('color_scheme') || error.message?.includes('year') || error.code === 'PGRST204') {
      console.warn('⚠️ Schema cache issue detected - retrying without problematic columns...');
      const { genres, color_scheme, year, ...minimalShowData } = showData;
      const { data: retryData, error: retryError } = await supabase
        .from('shows')
        .upsert(minimalShowData, {
          onConflict: 'trakt_id',
          ignoreDuplicates: false
        })
        .select('id, trakt_id, imdb_id, tvdb_id, tmdb_id, tvmaze_id, title, description, poster_url, backdrop_url, rating, total_seasons, total_episodes, created_at, updated_at')
        .single();
      
      if (retryError) {
        console.error('❌ Retry failed:', retryError);
        throw retryError;
      }
      console.log('✅ saveShow COMPLETE (without cache-problematic columns), ID:', retryData.id);
      return { ...retryData, year: null, color_scheme: null, genres: null } as DatabaseShow;
    }
    throw error;
  }

  console.log('✅ saveShow COMPLETE, ID:', data.id);
  return data as DatabaseShow;
}

export async function upsertShowFromAppModel(show: { 
  traktId: number; 
  tvmazeId?: number | null;
  tmdbId?: number | null;
  imdbId?: string | null;
  tvdbId?: number | null;
  title: string; 
  description?: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
}): Promise<DatabaseShow> {
  console.log('🔍 upsertShowFromAppModel START:', show.title);
  
  const existingShow = await getShowByTraktId(show.traktId);
  const colorScheme = existingShow?.color_scheme || assignColorToShow(show.traktId);
  
  const showData = {
    trakt_id: show.traktId,
    imdb_id: show.imdbId || null,
    tvdb_id: show.tvdbId || null,
    tmdb_id: show.tmdbId || null,
    tvmaze_id: show.tvmazeId || null,
    title: show.title,
    description: show.description || null,
    poster_url: show.posterUrl || null,
    backdrop_url: show.backdropUrl || null,
    rating: show.rating ? Number(show.rating.toFixed(1)) : null,
    total_seasons: show.totalSeasons ?? null,
    total_episodes: show.totalEpisodes ?? null,
    color_scheme: colorScheme,
    genres: [],
    updated_at: new Date().toISOString(),
  };

  console.log('💾 Upserting show from app model...');
  const { data, error } = await supabase
    .from('shows')
    .upsert(showData, {
      onConflict: 'trakt_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Upsert error:', error);
    if (error.message?.includes('genres') || error.message?.includes('color_scheme') || error.message?.includes('year') || error.code === 'PGRST204') {
      console.warn('⚠️ Schema cache issue detected - retrying without problematic columns...');
      const { genres, color_scheme, ...minimalShowData } = showData;
      const { data: retryData, error: retryError } = await supabase
        .from('shows')
        .upsert(minimalShowData, {
          onConflict: 'trakt_id',
          ignoreDuplicates: false
        })
        .select('id, trakt_id, imdb_id, tvdb_id, tmdb_id, tvmaze_id, title, description, poster_url, backdrop_url, rating, total_seasons, total_episodes, created_at, updated_at')
        .single();
      
      if (retryError) {
        console.error('❌ Retry failed:', retryError);
        throw retryError;
      }
      console.log('✅ upsertShowFromAppModel COMPLETE (without cache-problematic columns), ID:', retryData.id);
      return { ...retryData, year: null, color_scheme: null, genres: null } as DatabaseShow;
    }
    throw error;
  }

  console.log('✅ upsertShowFromAppModel COMPLETE, ID:', data.id);
  return data as DatabaseShow;
}

export async function saveEpisode(
  showId: string,
  tvmazeShowId: number | null,
  traktEpisode: TraktEpisode
): Promise<DatabaseEpisode> {
  let thumbnailUrl = null;

  if (tvmazeShowId) {
    const { getEpisode } = await import('./tvmaze');
    const episode = await getEpisode(tvmazeShowId, traktEpisode.season, traktEpisode.number);
    thumbnailUrl = episode?.image?.original || null;
  }

  const episodeData = {
    show_id: showId,
    trakt_id: traktEpisode.ids.trakt,
    imdb_id: traktEpisode.ids.imdb,
    tvdb_id: traktEpisode.ids.tvdb,
    tmdb_id: traktEpisode.ids.tmdb,
    season_number: traktEpisode.season,
    episode_number: traktEpisode.number,
    title: traktEpisode.title,
    description: traktEpisode.overview || null,
    thumbnail_url: thumbnailUrl,
    rating: traktEpisode.rating ? Number(traktEpisode.rating.toFixed(1)) : null,
  };

  const { data, error } = await supabase
    .from('episodes')
    .upsert(episodeData, {
      onConflict: 'show_id,season_number,episode_number',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving episode:', error);
    throw error;
  }

  return data as DatabaseEpisode;
}

export async function getShowById(showId: string): Promise<DatabaseShow | null> {
  const { data, error } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .single();

  if (error) {
    console.error('Error fetching show:', error);
    return null;
  }

  return data as DatabaseShow;
}

export async function getShowByTraktId(traktId: number): Promise<DatabaseShow | null> {
  const { data, error } = await supabase
    .from('shows')
    .select('*')
    .eq('trakt_id', traktId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching show by Trakt ID:', error);
    return null;
  }

  return data as DatabaseShow;
}

export async function upsertEpisodeMetadata(
  showId: string,
  seasonNumber: number,
  episodeNumber: number,
  metadata: {
    title: string;
    description: string;
    thumbnail_url?: string;
    trakt_id?: number;
    imdb_id?: string;
    tvdb_id?: number;
    tmdb_id?: number;
    rating?: number;
  }
): Promise<void> {
  const episodeData = {
    show_id: showId,
    season_number: seasonNumber,
    episode_number: episodeNumber,
    title: metadata.title,
    description: metadata.description,
    thumbnail_url: metadata.thumbnail_url || null,
    trakt_id: metadata.trakt_id || null,
    imdb_id: metadata.imdb_id || null,
    tvdb_id: metadata.tvdb_id || null,
    tmdb_id: metadata.tmdb_id || null,
    rating: metadata.rating || null,
  };

  const { error } = await supabase
    .from('episodes')
    .upsert(episodeData, {
      onConflict: 'show_id,season_number,episode_number',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error upserting episode metadata:', error);
    throw error;
  }
}

export async function getEpisodesByShowId(showId: string): Promise<DatabaseEpisode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('show_id', showId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true });

  if (error) {
    console.error('Error fetching episodes:', error);
    return [];
  }

  return data as DatabaseEpisode[];
}

export async function getEpisodeById(episodeId: string): Promise<DatabaseEpisode | null> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', episodeId)
    .single();

  if (error) {
    console.error('Error fetching episode:', error);
    return null;
  }

  return data as DatabaseEpisode;
}

/**
 * Ensures a show has a valid database UUID.
 * This function handles the conversion of Trakt IDs to database UUIDs for playlist operations.
 * 
 * @param show - The show object (may have either UUID or Trakt ID as its id)
 * @param traktShow - Optional full Trakt show data for saving if needed
 * @returns Database UUID for the show
 * @throws Error if show cannot be found or saved
 */
/**
 * DEPRECATED: Use ensureShowId from '@/services/showRegistry' instead.
 * This function is maintained for backwards compatibility.
 * 
 * Ensures a show exists in the database and returns its UUID.
 * Now delegates to the centralized ensureShowId for bulletproof behavior.
 */
export async function ensureShowUuid(
  show: { id: string; traktId: number; title: string },
  traktShow?: TraktShow
): Promise<string> {
  // Delegate to the centralized, bulletproof ensureShowId
  const { ensureShowId } = await import('./showRegistry');
  return ensureShowId({
    traktId: show.traktId,
    traktShow,
  });
}
