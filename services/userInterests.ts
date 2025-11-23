import { supabase } from '@/integrations/supabase/client';
import { TraktShow } from './trakt';

export interface UserInterests {
  genres: string[];
  shows: Array<{
    id: string;
    title: string;
    traktId: number;
    genres?: string[];
  }>;
}

/**
 * Fetches user's interest genres from:
 * 1. Shows selected during signup (stored in profiles.signup_shows)
 * 2. Shows they have logged/rated (from posts)
 */
export async function getUserInterests(userId: string): Promise<UserInterests> {
  try {
    console.log('📊 Fetching user interests for:', userId);
    
    // Get all shows the user has posted about
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('show_id')
      .eq('user_id', userId);
    
    if (postsError) {
      console.error('Error fetching user posts:', postsError);
      return { genres: [], shows: [] };
    }
    
    const postedShowIds = posts?.map(p => p.show_id).filter(Boolean) || [];
    console.log(`  Found ${postedShowIds.length} posted shows`);
    
    if (postedShowIds.length === 0) {
      console.log('  No shows found - returning empty interests');
      return { genres: [], shows: [] };
    }
    
    // Fetch show details from database including genres
    // Note: Try with genres first, fallback to without if schema cache not refreshed
    let shows = null;
    let showsError = null;
    
    const result = await supabase
      .from('shows')
      .select('id, title, trakt_id, genres')
      .in('id', postedShowIds);
    
    if (result.error && result.error.message?.includes('genres')) {
      console.warn('⚠️ Schema cache issue - genres column not in PostgREST cache, falling back without genres');
      const fallbackResult = await supabase
        .from('shows')
        .select('id, title, trakt_id')
        .in('id', postedShowIds);
      shows = fallbackResult.data;
      showsError = fallbackResult.error;
    } else {
      shows = result.data;
      showsError = result.error;
    }
    
    if (showsError) {
      console.error('Error fetching shows:', showsError);
      return { genres: [], shows: [] };
    }
    
    const userShows = (shows || []).map(show => ({
      id: show.id,
      title: show.title,
      traktId: show.trakt_id,
      genres: (show.genres || []) as string[]
    }));
    
    // Extract unique genres from all user shows
    const allGenres = new Set<string>();
    userShows.forEach(show => {
      (show.genres || []).forEach(genre => allGenres.add(genre));
    });
    
    const uniqueGenres = Array.from(allGenres);
    console.log(`✅ User interests: ${userShows.length} shows, ${uniqueGenres.length} unique genres:`, uniqueGenres.join(', '));
    
    return {
      genres: uniqueGenres,
      shows: userShows
    };
  } catch (error) {
    console.error('Error fetching user interests:', error);
    return { genres: [], shows: [] };
  }
}

/**
 * Gets all available genres from Trakt API standards
 */
export function getAllGenres(): string[] {
  return [
    'action',
    'adventure',
    'animation',
    'anime',
    'comedy',
    'crime',
    'documentary',
    'drama',
    'family',
    'fantasy',
    'history',
    'horror',
    'mystery',
    'romance',
    'science-fiction',
    'thriller',
    'war',
    'western'
  ];
}
