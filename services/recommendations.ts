import { supabase } from '@/app/integrations/supabase/client';
import { searchShows, getTrendingShows, TraktShow } from './trakt';
import { DatabaseShow } from './showDatabase';

interface RecentlyLoggedShow {
  show: DatabaseShow;
  lastLoggedAt: string;
  logCount: number;
}

export interface RecommendedShow {
  id?: string;
  trakt_id: number;
  title: string;
  description: string | null;
  poster_url: string | null;
  rating: number | null;
  genres: string[] | null;
  total_seasons: number | null;
  total_episodes: number | null;
  isFromDatabase: boolean;
}

/**
 * Convert a TraktShow to a RecommendedShow
 */
function traktShowToRecommendedShow(traktShow: TraktShow): RecommendedShow {
  return {
    trakt_id: traktShow.ids.trakt,
    title: traktShow.title,
    description: traktShow.overview || null,
    poster_url: null,
    rating: traktShow.rating ? Number(traktShow.rating.toFixed(1)) : null,
    genres: traktShow.genres || null,
    total_seasons: null,
    total_episodes: traktShow.aired_episodes || null,
    isFromDatabase: false
  };
}

/**
 * Convert a DatabaseShow to a RecommendedShow
 */
function databaseShowToRecommendedShow(dbShow: DatabaseShow): RecommendedShow {
  return {
    id: dbShow.id,
    trakt_id: dbShow.trakt_id,
    title: dbShow.title,
    description: dbShow.description,
    poster_url: dbShow.poster_url,
    rating: dbShow.rating,
    genres: dbShow.genres,
    total_seasons: dbShow.total_seasons,
    total_episodes: dbShow.total_episodes,
    isFromDatabase: true
  };
}

/**
 * Get shows the user has recently logged episodes from
 * Ordered by most recent log first
 */
export async function getRecentlyLoggedShows(
  userId: string,
  limit: number = 12
): Promise<DatabaseShow[]> {
  try {
    // Query watch_history to get recently logged shows
    const { data: watchHistory, error } = await supabase
      .from('watch_history')
      .select('show_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching watch history:', error);
      return [];
    }

    if (!watchHistory || watchHistory.length === 0) {
      return [];
    }

    // Group by show_id and get most recent log for each show
    const showMap = new Map<string, RecentlyLoggedShow>();
    
    for (const entry of watchHistory) {
      const existing = showMap.get(entry.show_id);
      if (!existing) {
        showMap.set(entry.show_id, {
          show: null as any, // Will be populated below
          lastLoggedAt: entry.created_at,
          logCount: 1
        });
      } else {
        existing.logCount++;
      }
    }

    // Get unique show IDs
    const showIds = Array.from(showMap.keys());

    // Fetch show details
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .in('id', showIds)
      .limit(limit);

    if (showsError) {
      console.error('❌ Error fetching shows:', showsError);
      return [];
    }

    if (!shows || shows.length === 0) {
      return [];
    }

    // Populate show data and sort by most recent log
    const recentShows = shows
      .map(show => {
        const metadata = showMap.get(show.id)!;
        return {
          ...metadata,
          show: show as DatabaseShow
        };
      })
      .sort((a, b) => new Date(b.lastLoggedAt).getTime() - new Date(a.lastLoggedAt).getTime())
      .slice(0, limit)
      .map(item => item.show);

    console.log(`✅ Found ${recentShows.length} recently logged shows`);
    return recentShows;
  } catch (error) {
    console.error('❌ Error in getRecentlyLoggedShows:', error);
    return [];
  }
}

/**
 * Build user's genre interest profile from their logged shows
 * Returns array of genres ordered by frequency
 */
export async function getUserGenreInterests(userId: string): Promise<string[]> {
  try {
    // Get all shows the user has logged
    const { data: watchHistory, error } = await supabase
      .from('watch_history')
      .select('show_id')
      .eq('user_id', userId);

    if (error || !watchHistory || watchHistory.length === 0) {
      console.log('ℹ️ No watch history found for genre interests');
      return [];
    }

    // Get unique show IDs
    const showIds = [...new Set(watchHistory.map(wh => wh.show_id))];

    // Fetch show details to get genres
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('genres')
      .in('id', showIds);

    if (showsError || !shows) {
      console.error('❌ Error fetching shows for genre interests:', showsError);
      return [];
    }

    // Count genre frequency
    const genreCount = new Map<string, number>();
    
    for (const show of shows) {
      if (show.genres && Array.isArray(show.genres)) {
        for (const genre of show.genres) {
          if (typeof genre === 'string') {
            genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
          }
        }
      }
    }

    // Sort by frequency and return top genres
    const sortedGenres = Array.from(genreCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    console.log(`✅ User genre interests:`, sortedGenres);
    return sortedGenres;
  } catch (error) {
    console.error('❌ Error in getUserGenreInterests:', error);
    return [];
  }
}

/**
 * Get show recommendations based on user's genre interests
 * Orders by rating (highest first)
 */
export async function getGenreBasedRecommendations(
  genres: string[],
  limit: number = 12
): Promise<any[]> {
  try {
    if (genres.length === 0) {
      console.log('ℹ️ No genres provided, returning empty recommendations');
      return [];
    }

    // Search for shows in each genre and combine results
    const allRecommendations: any[] = [];
    
    // Use the primary genre for search
    const primaryGenre = genres[0];
    const searchResponse = await searchShows(`${primaryGenre} tv show`);
    
    // searchShows returns { results: [...], hasMore: boolean }
    // Trakt multi-search returns heterogeneous result types (show, movie, person, etc.)
    if (searchResponse && searchResponse.results && searchResponse.results.length > 0) {
      // Filter for show results only and extract the show object
      const shows = searchResponse.results
        .filter((result: any) => result.type === 'show' && result.show)
        .map((result: any) => result.show);
      
      allRecommendations.push(...shows);
    }

    // Remove duplicates by trakt_id and sort by rating
    const uniqueShows = Array.from(
      new Map(allRecommendations.map(show => [show.ids.trakt, show]))
        .values()
    );

    const sorted = uniqueShows
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);

    console.log(`✅ Found ${sorted.length} genre-based recommendations`);
    return sorted;
  } catch (error) {
    console.error('❌ Error in getGenreBasedRecommendations:', error);
    return [];
  }
}

/**
 * Get combined show recommendations for a user
 * Returns recently logged shows first, then interest-based recommendations
 * Up to maxShows total (default 12)
 */
export async function getCombinedRecommendations(
  userId: string,
  maxShows: number = 12
): Promise<RecommendedShow[]> {
  try {
    // 1. Get recently logged shows (already DatabaseShow[])
    const recentlyLogged = await getRecentlyLoggedShows(userId, maxShows);
    
    // 2. If we have enough recent shows, normalize and return them
    if (recentlyLogged.length >= maxShows) {
      return recentlyLogged
        .slice(0, maxShows)
        .map(databaseShowToRecommendedShow);
    }

    // 3. Get user's genre interests
    const genres = await getUserGenreInterests(userId);

    // 4. Get genre-based recommendations to fill remaining slots
    const remainingSlots = maxShows - recentlyLogged.length;
    
    let traktRecommendations: TraktShow[] = [];
    if (genres.length > 0) {
      traktRecommendations = await getGenreBasedRecommendations(genres, remainingSlots * 2);
    } else {
      // Fallback to trending shows if no genre interests
      console.log('ℹ️ No genre interests, using trending shows as fallback');
      traktRecommendations = await getTrendingShows(remainingSlots * 2);
    }

    // 5. Filter out shows the user has already logged (dedupe by trakt_id)
    // Both sides use numeric Trakt IDs, so Set.has() works correctly
    const loggedTraktIds = new Set(recentlyLogged.map(show => show.trakt_id));
    const filteredRecommendations = traktRecommendations
      .filter(traktShow => !loggedTraktIds.has(traktShow.ids.trakt))
      .slice(0, remainingSlots);

    // 6. Normalize both types to RecommendedShow and combine
    const normalizedRecent = recentlyLogged.map(databaseShowToRecommendedShow);
    const normalizedRecommendations = filteredRecommendations.map(traktShowToRecommendedShow);
    
    const combined = [
      ...normalizedRecent,
      ...normalizedRecommendations
    ];
    
    console.log(`✅ Combined recommendations: ${normalizedRecent.length} recent + ${normalizedRecommendations.length} interest-based`);
    return combined;
  } catch (error) {
    console.error('❌ Error in getCombinedRecommendations:', error);
    return [];
  }
}
