import { supabase } from '@/app/integrations/supabase/client';
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
    
    // 1. Get signup shows from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('signup_shows')
      .eq('id', userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }
    
    const signupShowIds = profile?.signup_shows || [];
    console.log(`  Found ${signupShowIds.length} signup shows`);
    
    // 2. Get all shows the user has posted about
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('show_id')
      .eq('user_id', userId);
    
    if (postsError) {
      console.error('Error fetching user posts:', postsError);
    }
    
    const postedShowIds = posts?.map(p => p.show_id).filter(Boolean) || [];
    console.log(`  Found ${postedShowIds.length} posted shows`);
    
    // 3. Combine and deduplicate show IDs
    const allShowIds = Array.from(new Set([...signupShowIds, ...postedShowIds]));
    console.log(`  Total unique shows: ${allShowIds.length}`);
    
    if (allShowIds.length === 0) {
      console.log('  No shows found - returning empty interests');
      return { genres: [], shows: [] };
    }
    
    // 4. Fetch show details from database
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, title, trakt_id, genres')
      .in('id', allShowIds);
    
    if (showsError) {
      console.error('Error fetching shows:', showsError);
      return { genres: [], shows: [] };
    }
    
    const userShows = (shows || []).map(show => ({
      id: show.id,
      title: show.title,
      traktId: show.trakt_id,
      genres: show.genres || []
    }));
    
    // 5. Extract and count genres
    const genreCounts = new Map<string, number>();
    userShows.forEach(show => {
      show.genres?.forEach(genre => {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      });
    });
    
    // 6. Sort genres by frequency (most common first)
    const sortedGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);
    
    console.log(`✅ User interests: ${sortedGenres.length} genres from ${userShows.length} shows`);
    console.log(`  Top genres: ${sortedGenres.slice(0, 5).join(', ')}`);
    
    return {
      genres: sortedGenres,
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
    'music',
    'mystery',
    'romance',
    'science-fiction',
    'thriller',
    'war',
    'western'
  ];
}
