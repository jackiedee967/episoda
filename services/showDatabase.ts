import { supabase } from '@/app/integrations/supabase/client';
import { TraktShow, TraktEpisode } from './trakt';
import { getPosterUrl, getEpisodeThumbnail } from './tvmaze';

export interface DatabaseShow {
  id: string;
  trakt_id: number;
  imdb_id: string | null;
  tvdb_id: number | null;
  tmdb_id: number | null;
  tvmaze_id: number | null;
  title: string;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  total_seasons: number | null;
  total_episodes: number | null;
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
  let tvmazeShow = null;
  let posterUrl = options.enrichedPosterUrl || null;
  let tvmazeId = options.enrichedTVMazeId || null;

  if (!tvmazeId || !posterUrl) {
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
  }

  let backdropUrl = options.enrichedBackdropUrl || null;
  if (!backdropUrl && tvmazeId) {
    const { getBackdropUrl } = await import('./tvmaze');
    backdropUrl = await getBackdropUrl(tvmazeId);
  }

  const showData = {
    trakt_id: traktShow.ids.trakt,
    imdb_id: options.enrichedImdbId || traktShow.ids.imdb,
    tvdb_id: traktShow.ids.tvdb,
    tmdb_id: traktShow.ids.tmdb,
    tvmaze_id: tvmazeId,
    title: traktShow.title,
    description: traktShow.overview || null,
    poster_url: posterUrl,
    backdrop_url: backdropUrl,
    rating: traktShow.rating ? Number(traktShow.rating.toFixed(1)) : null,
    total_seasons: options.enrichedSeasonCount ?? null,
    total_episodes: traktShow.aired_episodes || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingShow } = await supabase
    .from('shows')
    .select('*')
    .eq('trakt_id', traktShow.ids.trakt)
    .single();

  if (existingShow) {
    const { data, error } = await supabase
      .from('shows')
      .update(showData)
      .eq('trakt_id', traktShow.ids.trakt)
      .select()
      .single();

    if (error) {
      console.error('Error updating show:', error);
      throw error;
    }

    return data as DatabaseShow;
  } else {
    const { data, error } = await supabase
      .from('shows')
      .insert(showData)
      .select()
      .single();

    if (error) {
      console.error('Error saving show:', error);
      throw error;
    }

    return data as DatabaseShow;
  }
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

  const { data: existingEpisode } = await supabase
    .from('episodes')
    .select('*')
    .eq('show_id', showId)
    .eq('season_number', traktEpisode.season)
    .eq('episode_number', traktEpisode.number)
    .single();

  if (existingEpisode) {
    const { data, error } = await supabase
      .from('episodes')
      .update(episodeData)
      .eq('show_id', showId)
      .eq('season_number', traktEpisode.season)
      .eq('episode_number', traktEpisode.number)
      .select()
      .single();

    if (error) {
      console.error('Error updating episode:', error);
      throw error;
    }

    return data as DatabaseEpisode;
  } else {
    const { data, error } = await supabase
      .from('episodes')
      .insert(episodeData)
      .select()
      .single();

    if (error) {
      console.error('Error saving episode:', error);
      throw error;
    }

    return data as DatabaseEpisode;
  }
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
