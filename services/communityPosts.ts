import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types';

export interface CommunityPostsOptions {
  userId: string;
  excludedPostIds?: string[];
  limit?: number;
}

function generateAvatarDataURI(colorScheme: any, icon: string): string {
  const bg1 = colorScheme?.background1 || '#3B82F6';
  const bg2 = colorScheme?.background2 || '#8B5CF6';
  const iconColor = colorScheme?.icon || '#FFFFFF';
  
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${bg1};stop-opacity:1"/><stop offset="100%" style="stop-color:${bg2};stop-opacity:1"/></linearGradient></defs><rect width="64" height="64" fill="url(#grad)"/><text x="32" y="42" font-size="32" text-anchor="middle" fill="${iconColor}">${icon}</text></svg>`
  )}`;
}

export async function getCommunityPosts(options: CommunityPostsOptions): Promise<Post[]> {
  const { userId, excludedPostIds = [], limit = 10 } = options;

  try {
    const { data: userPosts } = await supabase
      .from('posts')
      .select('show_id')
      .eq('user_id', userId);

    const loggedShowIds = userPosts?.map(p => p.show_id) || [];

    let query = supabase
      .from('posts')
      .select('*')
      .neq('user_id', userId);

    if (loggedShowIds.length > 0) {
      query = query.in('show_id', loggedShowIds);
    } else {
      const { data: trendingShows } = await supabase
        .from('shows')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(20);

      const trendingShowIds = trendingShows?.map(s => s.id) || [];
      if (trendingShowIds.length > 0) {
        query = query.in('show_id', trendingShowIds);
      }
    }

    const fetchLimit = loggedShowIds.length > 0 && loggedShowIds.length <= 10 ? 1000 : 500;
    const { data: allPosts, error } = await query
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      console.error('Error fetching community posts:', error);
      return [];
    }

    if (!allPosts || allPosts.length === 0) {
      console.log(`⚠️ No community posts found (searched ${loggedShowIds.length > 0 ? 'logged shows' : 'trending shows'})`);
      return [];
    }

    const validPosts = allPosts.filter(p => 
      p && 
      p.id && 
      p.user_id && 
      p.show_id && 
      p.created_at &&
      !excludedPostIds.includes(p.id)
    );

    if (validPosts.length === 0) {
      console.log('No valid community posts after filtering');
      return [];
    }

    const postIds = validPosts.map(p => p.id);
    const uniqueUserIds = [...new Set(validPosts.map(p => p.user_id))];
    const uniqueShowIds = [...new Set(validPosts.map(p => p.show_id))];
    const allEpisodeIds = [...new Set(validPosts.flatMap(p => p.episode_ids || []))];

    const [usersResult, socialLinksResult, showsResult, episodesResult, likesResult, userLikesResult, commentsResult, repostsResult] = await Promise.all([
      (supabase as any).from('profiles').select('*').in('user_id', uniqueUserIds),
      (supabase as any).from('social_links').select('*').in('user_id', uniqueUserIds),
      supabase.from('shows').select('*').in('id', uniqueShowIds),
      allEpisodeIds.length > 0 ? supabase.from('episodes').select('*').in('id', allEpisodeIds) : { data: [] },
      (supabase as any).from('likes').select('post_id').in('post_id', postIds),
      (supabase as any).from('likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
      (supabase as any).from('comments').select('post_id').in('post_id', postIds),
      (supabase as any).from('reposts').select('post_id').in('post_id', postIds),
    ]);

    // Group social links by user_id
    const socialLinksByUser: Record<string, any[]> = {};
    (socialLinksResult.data || []).forEach((link: any) => {
      if (!socialLinksByUser[link.user_id]) {
        socialLinksByUser[link.user_id] = [];
      }
      socialLinksByUser[link.user_id].push({
        platform: link.platform,
        url: link.url,
      });
    });

    const usersMap = new Map();
    (usersResult.data || []).forEach((profile: any) => {
      let avatarUrl = profile.avatar_url || '';
      if (!avatarUrl && profile.avatar_color_scheme && profile.avatar_icon) {
        avatarUrl = generateAvatarDataURI(profile.avatar_color_scheme, profile.avatar_icon);
      }
      usersMap.set(profile.user_id, {
        id: profile.user_id,
        username: profile.username || 'user',
        displayName: profile.display_name || profile.username || 'User',
        avatar: avatarUrl,
        bio: profile.bio || '',
        socialLinks: socialLinksByUser[profile.user_id] || [],
        following: [],
        followers: [],
      });
    });

    const showsMap = new Map();
    (showsResult.data || []).forEach((show: any) => {
      showsMap.set(show.id, show);
    });

    const episodesMap = new Map();
    (episodesResult.data || []).forEach((ep: any) => {
      episodesMap.set(ep.id, {
        id: ep.id,
        number: ep.episode_number,
        season: ep.season_number,
        title: ep.title || `Episode ${ep.episode_number}`,
        thumbnail: ep.thumbnail_url || undefined,
      });
    });

    const likesCount = new Map<string, number>();
    const commentsCount = new Map<string, number>();
    const repostsCount = new Map<string, number>();
    const userLikesSet = new Set<string>();

    (likesResult.data || []).forEach((like: any) => {
      likesCount.set(like.post_id, (likesCount.get(like.post_id) || 0) + 1);
    });

    (userLikesResult.data || []).forEach((like: any) => {
      userLikesSet.add(like.post_id);
    });

    (commentsResult.data || []).forEach((comment: any) => {
      commentsCount.set(comment.post_id, (commentsCount.get(comment.post_id) || 0) + 1);
    });

    (repostsResult.data || []).forEach((repost: any) => {
      repostsCount.set(repost.post_id, (repostsCount.get(repost.post_id) || 0) + 1);
    });

    const transformedPosts: Post[] = validPosts.map((dbPost: any) => {
      const authorProfile = usersMap.get(dbPost.user_id) || {
        id: dbPost.user_id,
        username: 'unknown',
        displayName: 'Unknown User',
        avatar: '',
        bio: '',
        socialLinks: [],
        following: [],
        followers: [],
      };

      const showData = showsMap.get(dbPost.show_id);
      const episodes = (dbPost.episode_ids || [])
        .map((id: string) => episodesMap.get(id))
        .filter((ep: any) => ep !== undefined);

      return {
        id: dbPost.id,
        user: authorProfile,
        show: {
          id: dbPost.show_id,
          title: dbPost.show_title || showData?.title || 'Unknown Show',
          poster: dbPost.show_poster || showData?.poster_url || null,
          backdrop: showData?.backdrop_url || null,
          description: showData?.description || '',
          rating: showData?.rating || 0,
          totalSeasons: showData?.total_seasons || 0,
          totalEpisodes: showData?.total_episodes || 0,
          friendsWatching: 0,
          traktId: showData?.trakt_id,
          colorScheme: showData?.color_scheme || null,
        },
        episodes: episodes.length > 0 ? episodes : undefined,
        episode: episodes.length > 0 ? episodes[0] : undefined,
        title: dbPost.title || undefined,
        body: dbPost.body || '',
        timestamp: new Date(dbPost.created_at),
        likes: likesCount.get(dbPost.id) || 0,
        comments: commentsCount.get(dbPost.id) || 0,
        reposts: repostsCount.get(dbPost.id) || 0,
        isLiked: userLikesSet.has(dbPost.id),
        rating: dbPost.rating || undefined,
        tags: dbPost.tags || [],
        isSpoiler: (dbPost.tags || []).some((tag: string) => tag.toLowerCase().includes('spoiler')),
      };
    });

    const postsWithEngagement = transformedPosts.map(post => ({
      post,
      engagementScore: post.likes + post.comments + post.reposts,
    }));

    const sortedPosts = postsWithEngagement
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .map(item => item.post)
      .slice(0, limit);

    console.log(`✅ Fetched ${sortedPosts.length} community posts (from ${loggedShowIds.length > 0 ? 'logged shows' : 'trending shows'}) sorted by popularity`);
    
    return sortedPosts;

  } catch (error) {
    console.error('Error in getCommunityPosts:', error);
    return [];
  }
}
