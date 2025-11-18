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
 * Uses posts table as the source of truth for watched shows
 */
export async function getRecentlyLoggedShows(
  userId: string,
  limit: number = 12
): Promise<DatabaseShow[]> {
  try {
    // Query posts to get recently logged shows
    const { data: posts, error } = await supabase
      .from('posts')
      .select('show_id, created_at')
      .eq('user_id', userId)
      .not('show_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Database error fetching posts (non-critical):', error.message || error);
      return [];
    }

    if (!posts || posts.length === 0) {
      console.log('ℹ️ No posts found for user');
      return [];
    }

    // Group by show_id and get most recent post for each show
    const showMap = new Map<string, RecentlyLoggedShow>();
    
    for (const post of posts) {
      const existing = showMap.get(post.show_id);
      if (!existing) {
        showMap.set(post.show_id, {
          show: null as any, // Will be populated below
          lastLoggedAt: post.created_at,
          logCount: 1
        });
      } else {
        existing.logCount++;
      }
    }

    // Get unique show IDs
    const showIds = Array.from(showMap.keys());

    // Fetch show details (NO limit here - we need all shows to sort properly)
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .in('id', showIds);

    if (showsError) {
      console.warn('⚠️ Database error fetching shows (non-critical):', showsError.message || showsError);
      return [];
    }

    if (!shows || shows.length === 0) {
      console.log('ℹ️ No shows found in database');
      return [];
    }

    // Populate show data, sort by most recent post, THEN apply limit
    const recentShows = shows
      .map(show => {
        const metadata = showMap.get(show.id)!;
        return {
          ...metadata,
          show: show as DatabaseShow
        };
      })
      .sort((a, b) => new Date(b.lastLoggedAt).getTime() - new Date(a.lastLoggedAt).getTime())
      .slice(0, limit)  // Apply limit AFTER sorting
      .map(item => item.show);

    console.log(`✅ Found ${recentShows.length} recently logged shows`);
    return recentShows;
  } catch (error) {
    console.warn('⚠️ Unexpected error in getRecentlyLoggedShows (non-critical):', error instanceof Error ? error.message : String(error));
    return []; // Always return empty array, never throw
  }
}

/**
 * Build user's genre interest profile from their logged shows
 * Returns array of genres ordered by frequency
 * Uses posts table to determine which shows the user has logged
 */
export async function getUserGenreInterests(userId: string): Promise<string[]> {
  try {
    // Get all shows the user has posted about
    const { data: posts, error } = await supabase
      .from('posts')
      .select('show_id')
      .eq('user_id', userId)
      .not('show_id', 'is', null);

    if (error || !posts || posts.length === 0) {
      console.log('ℹ️ No posts found for genre interests');
      return [];
    }

    // Get unique show IDs
    const showIds = [...new Set(posts.map(p => p.show_id))];

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
 * CRITICAL: Always returns recently logged shows even if Trakt API fails
 */
export async function getCombinedRecommendations(
  userId: string,
  maxShows: number = 12
): Promise<RecommendedShow[]> {
  try {
    // 1. Get recently logged shows (already DatabaseShow[]) - ALWAYS fetch this
    const recentlyLogged = await getRecentlyLoggedShows(userId, maxShows);
    console.log(`✅ Fetched ${recentlyLogged.length} recently logged shows for recommendations`);
    
    // 2. If we have enough recent shows, normalize and return them
    if (recentlyLogged.length >= maxShows) {
      return recentlyLogged
        .slice(0, maxShows)
        .map(databaseShowToRecommendedShow);
    }

    // 3. Try to get user's genre interests (may fail)
    let genres: string[] = [];
    try {
      genres = await getUserGenreInterests(userId);
    } catch (error) {
      console.warn('⚠️ Failed to get genre interests, will use trending shows', error);
    }

    // 4. Try to get genre-based or trending recommendations to fill remaining slots
    const remainingSlots = maxShows - recentlyLogged.length;
    
    let traktRecommendations: TraktShow[] = [];
    try {
      if (genres.length > 0) {
        traktRecommendations = await getGenreBasedRecommendations(genres, remainingSlots * 2);
      } else {
        // Fallback to trending shows if no genre interests
        console.log('ℹ️ No genre interests, using trending shows as fallback');
        traktRecommendations = await getTrendingShows(remainingSlots * 2);
      }
    } catch (error) {
      // CRITICAL: If Trakt fails, we still return recently logged shows
      console.warn('⚠️ Trakt API failed, returning recently logged shows only', error);
      const normalizedRecent = recentlyLogged.map(databaseShowToRecommendedShow);
      console.log(`✅ Fetched ${normalizedRecent.length} raw recommendations for caching (database only - API unavailable)`);
      return normalizedRecent;
    }

    // 5. Filter out shows the user has already logged (dedupe by trakt_id)
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
    
    console.log(`✅ Fetched ${combined.length} raw recommendations for caching (${normalizedRecent.length} recent + ${normalizedRecommendations.length} from API)`);
    return combined;
  } catch (error) {
    console.error('❌ Critical error in getCombinedRecommendations:', error);
    // Last resort: try to return recently logged shows only
    try {
      const recentlyLogged = await getRecentlyLoggedShows(userId, maxShows);
      const normalized = recentlyLogged.map(databaseShowToRecommendedShow);
      console.log(`⚠️ Returning ${normalized.length} recently logged shows as emergency fallback`);
      return normalized;
    } catch (fallbackError) {
      console.error('❌ Even fallback failed:', fallbackError);
      return [];
    }
  }
}
