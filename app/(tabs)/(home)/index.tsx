import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, Platform, ImageBackground } from 'react-native';
import { colors, typography } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import { LogAShow } from '@/components/LogAShow';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { mockShows, mockUsers } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { ChevronRight, Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PostCardSkeleton from '@/components/skeleton/PostCardSkeleton';
import FadeInView from '@/components/FadeInView';
import { Friends } from '@/components/Friends';
import { supabase } from '@/app/integrations/supabase/client';
import { User, Post } from '@/types';
import { getCommunityPosts } from '@/services/communityPosts';

type SuggestedUser = User & {
  mutualFriends: Array<{
    id: string;
    avatar?: string;
    displayName?: string;
    username?: string;
  }>;
};

export default function HomeScreen() {
  const router = useRouter();
  const { posts, currentUser, followUser, unfollowUser, isFollowing, allReposts, isShowInPlaylist, playlists, getHomeFeed, cachedRecommendations, ensureShowUuid } = useData();
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [selectedTraktShow, setSelectedTraktShow] = useState<any>(null);
  const [navigatingShowId, setNavigatingShowId] = useState<string | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [currentlyWatchingShows, setCurrentlyWatchingShows] = useState<any[]>([]);
  const [recommendedShows, setRecommendedShows] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isShowSaved = useCallback((showId: string, traktId?: number) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  }, [playlists, isShowInPlaylist]);

  const handleShowPress = useCallback(async (show: any) => {
    // Ensure show has an ID for loading state (use fallback if needed)
    const showId = show.id || `trakt-${show.traktId}`;
    
    try {
      setNavigatingShowId(showId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Resolve Trakt ID to UUID if needed
      const uuid = await ensureShowUuid(show, show.traktShow);
      
      router.push(`/show/${uuid}`);
    } catch (error) {
      console.error('Failed to navigate to show:', error);
    } finally {
      setNavigatingShowId(null);
    }
  }, [ensureShowUuid, router]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Once we have posts loaded, set loading to false
    const timer = setTimeout(() => {
      setIsLoadingFeed(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [posts]);

  // Fetch suggested users with mutual friends
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      if (!currentUser?.id) return;

      try {
        // Get users the current user is following
        const { data: currentUserFollowing } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);
        
        const followingIds = currentUserFollowing?.map(f => f.following_id) || [];

        // Get all users who are NOT being followed (excluding current user)
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUser.id)
          .limit(20);

        if (!allUsers) return;

        // Filter to users not being followed and calculate mutual friends
        const usersWithMutuals: SuggestedUser[] = [];

        for (const user of allUsers) {
          // Skip if already following
          if (followingIds.includes(user.id)) continue;

          // Get followers of this user
          const { data: userFollowers } = await supabase
            .from('follows')
            .select(`
              follower:profiles!follows_follower_id_fkey(
                id,
                username,
                display_name,
                avatar
              )
            `)
            .eq('following_id', user.id);

          // Find mutual friends (followers of this user who are followed by current user)
          const mutualFriends = (userFollowers || [])
            .map(f => f.follower)
            .filter(follower => follower && followingIds.includes(follower.id))
            .map(follower => ({
              id: follower.id,
              avatar: follower.avatar || undefined,
              displayName: follower.display_name || undefined,
              username: follower.username || '',
            }));

          // Only include users with mutual friends for better relevance
          if (mutualFriends.length > 0) {
            usersWithMutuals.push({
              id: user.id,
              username: user.username || '',
              displayName: user.display_name || '',
              avatar: user.avatar || '',
              bio: user.bio || '',
              socialLinks: [],
              mutualFriends,
            });
          }

          // Stop once we have 5 users
          if (usersWithMutuals.length >= 5) break;
        }

        setSuggestedUsers(usersWithMutuals);
      } catch (error) {
        console.error('Error fetching suggested users:', error);
      }
    };

    fetchSuggestedUsers();
  }, [currentUser?.id]);

  // Fetch currently watching shows (last 6 unique shows user has logged)
  useEffect(() => {
    if (!currentUser?.id || posts.length === 0) return;

    // Get user's posts only
    const userPosts = posts.filter(post => post.user.id === currentUser.id && post.show);
    
    // Extract unique shows (most recent first)
    const uniqueShows = new Map();
    for (const post of userPosts) {
      if (post.show && !uniqueShows.has(post.show.id)) {
        uniqueShows.set(post.show.id, post.show);
        if (uniqueShows.size >= 6) break;
      }
    }
    
    setCurrentlyWatchingShows(Array.from(uniqueShows.values()));
  }, [currentUser?.id, posts]);

  // Fetch recommended shows (friends' shows + cached interest-based recommendations)
  useEffect(() => {
    if (!currentUser?.id) return;

    try {
      // Get traktIds from Currently Watching to exclude them
      const currentlyWatchingTraktIds = new Set(
        currentlyWatchingShows
          .map(show => show.traktId)
          .filter(Boolean)
      );

      const followingIds = currentUser.following || [];
      
      // 1. Get shows from friends' posts and count unique friends per show
      const friendsPosts = posts.filter(post => 
        followingIds.includes(post.user.id) && post.show
      );

      // Use traktId as consistent identifier, count unique friends
      const showFriendCounts = new Map<number, { show: any; friendCount: number; friendIds: Set<string> }>();
      
      for (const post of friendsPosts) {
        const traktId = post.show.traktId;
        if (!traktId) continue;
        
        // Skip if in Currently Watching
        if (currentlyWatchingTraktIds.has(traktId)) continue;
        
        const existing = showFriendCounts.get(traktId);
        if (existing) {
          existing.friendIds.add(post.user.id);
          existing.friendCount = existing.friendIds.size;
        } else {
          showFriendCounts.set(traktId, {
            show: post.show,
            friendCount: 1,
            friendIds: new Set([post.user.id])
          });
        }
      }

      // Sort by friend count (descending) - DON'T slice yet
      const friendsShows = Array.from(showFriendCounts.values())
        .sort((a, b) => b.friendCount - a.friendCount);

      // 2. Use cached recommendations from DataContext (already fetched and enriched)
      const recommendations = cachedRecommendations || [];
      
      // 3. Normalize all shows to consistent format using traktId as key
      // Ensure every show has an ID (use trakt-{id} as fallback)
      const normalizedFriendsShows = friendsShows.map(item => ({
        id: item.show.id || `trakt-${item.show.traktId}`,
        traktId: item.show.traktId,
        title: item.show.title,
        poster: item.show.poster || item.show.posterUrl || null
      }));

      const normalizedInterestShows = recommendations
        .filter(rec => rec?.show?.poster && rec?.traktId && !currentlyWatchingTraktIds.has(rec.traktId))
        .map(rec => ({
          id: rec.show!.id || `trakt-${rec.traktId!}`,
          traktId: rec.traktId!,
          title: rec.show!.title,
          poster: rec.show!.poster,
          traktShow: rec.traktShow  // Include raw Trakt data
        }));

      // 4. Merge: friends' shows first (by friend count), then interest-based
      // Remove duplicates by traktId (keep first occurrence = friend show)
      const seenTraktIds = new Set<number>();
      const combined = [];

      // Add friends' shows first (already sorted by friend count)
      for (const show of normalizedFriendsShows) {
        if (!seenTraktIds.has(show.traktId)) {
          seenTraktIds.add(show.traktId);
          combined.push(show);
        }
      }

      // Add interest-based shows (only if not already added)
      for (const show of normalizedInterestShows) {
        if (!seenTraktIds.has(show.traktId)) {
          seenTraktIds.add(show.traktId);
          combined.push(show);
        }
      }

      // NOW slice to 10
      setRecommendedShows(combined.slice(0, 10));
    } catch (error) {
      console.error('Error fetching recommended shows:', error);
    }
  }, [currentUser?.id, currentUser?.following, posts, currentlyWatchingShows, cachedRecommendations]);

  useEffect(() => {
    const fetchCommunityPosts = async () => {
      if (!currentUser?.id || isLoadingFeed) return;

      const homeFeed = getHomeFeed();
      const activityPosts = homeFeed.filter(item => 
        currentUser.following?.includes(item.post.user.id) || 
        item.post.user.id === currentUser.id
      );
      
      if (activityPosts.length < 5) {
        const activityPostIds = activityPosts.map(item => item.post.id);
        const needed = 5 - activityPosts.length;
        
        const rawCommunityPosts = await getCommunityPosts({
          userId: currentUser.id,
          excludedPostIds: activityPostIds,
          limit: needed,
        });
        
        setCommunityPosts(rawCommunityPosts);
      } else {
        setCommunityPosts([]);
      }
    };

    fetchCommunityPosts();
  }, [currentUser?.id, currentUser?.following, posts, isLoadingFeed, getHomeFeed]);

  const handleLike = (postId: string) => {
    console.log('Like post:', postId);
  };

  const handleRepost = (postId: string) => {
    console.log('Repost post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };

  const handleFollowUser = async (userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Stack.Screen options={{ headerShown: false }} />
      <Image 
        source={require('@/assets/images/8bb62a0a-b050-44de-b77b-ca88fbec6d81.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Pressable onPress={handleProfilePress}>
        <Image 
          source={{ uri: currentUser.avatar }}
          style={styles.profilePic}
        />
      </Pressable>
    </View>
  );

  const renderDivider = () => (
    <View style={styles.divider} />
  );

  const renderWelcome = () => (
    <View style={styles.welcomeSection}>
      <Text style={styles.welcomeBack}>Welcome back</Text>
      <Text style={styles.userName}>{currentUser.displayName}</Text>
    </View>
  );

  const renderPostInput = () => (
    <LogAShow onPress={() => setPostModalVisible(true)} />
  );

  const renderCurrentlyWatching = () => {
    if (currentlyWatchingShows.length === 0) return null;

    return (
      <View style={styles.currentlyWatchingSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Currently Watching</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.showsScroll}
          style={styles.showsScrollView}
        >
          {currentlyWatchingShows.map((show) => (
            <Pressable
              key={show.id}
              style={[
                styles.showCard,
                navigatingShowId === show.id && { opacity: 0.5 }
              ]}
              onPress={() => handleShowPress(show)}
              disabled={navigatingShowId === show.id}
            >
              <View style={styles.posterWrapper}>
                <Image 
                  source={{ uri: show.poster || 'https://via.placeholder.com/215x280' }}
                  style={styles.showImage}
                />
                
                <Pressable 
                  style={({ pressed }) => [
                    styles.saveIcon,
                    pressed && styles.saveIconPressed,
                  ]} 
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedShow(show);
                    setSelectedTraktShow(show.traktShow || null);
                    setPlaylistModalVisible(true);
                  }}
                >
                  <IconSymbol 
                    name={isShowSaved(show.id, show.traktId) ? "bookmark.fill" : "bookmark"} 
                    size={18} 
                    color={tokens.colors.pureWhite} 
                  />
                </Pressable>

                <Pressable 
                  style={styles.logEpisodeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedShow(show);
                    setPostModalVisible(true);
                  }}
                >
                  <Text style={styles.logEpisodeButtonText}>Log episode</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRecommendedTitles = () => {
    if (recommendedShows.length === 0) return null;

    // Pre-compute friend counts and avatars for all shows (avoid O(n*m) per-render scans)
    const followingIds = currentUser.following || [];
    const friendDataCache = new Map<number, { count: number; users: any[] }>();

    // Single pass over posts to build cache
    for (const post of posts) {
      if (!followingIds.includes(post.user.id) || !post.show?.traktId) continue;
      
      const traktId = post.show.traktId;
      const existing = friendDataCache.get(traktId);
      
      if (existing) {
        // Check if this friend already counted
        if (!existing.users.find(u => u.id === post.user.id)) {
          existing.users.push(post.user);
          existing.count = existing.users.length;
        }
      } else {
        friendDataCache.set(traktId, {
          count: 1,
          users: [post.user]
        });
      }
    }

    return (
      <View style={styles.recommendedSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>For You</Text>
          <Pressable 
            style={styles.viewMoreButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.viewMoreText}>View more ›</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.showsScroll}
          style={styles.showsScrollView}
        >
          {recommendedShows.map((show) => {
            const friendData = friendDataCache.get(show.traktId);
            const friendCount = friendData?.count || 0;
            const friendsWatching = friendData?.users.slice(0, 3) || [];

            return (
              <Pressable
                key={show.id}
                style={[
                  styles.showCard,
                  navigatingShowId === show.id && { opacity: 0.5 }
                ]}
                onPress={() => handleShowPress(show)}
                disabled={navigatingShowId === show.id}
              >
                <View style={styles.posterWrapper}>
                  <Image 
                    source={{ uri: show.poster || 'https://via.placeholder.com/215x280' }}
                    style={styles.showImage}
                  />
                  
                  <Pressable 
                    style={({ pressed }) => [
                      styles.saveIcon,
                      pressed && styles.saveIconPressed,
                    ]} 
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedShow(show);
                      setSelectedTraktShow(show.traktShow || null);
                      setPlaylistModalVisible(true);
                    }}
                  >
                    <IconSymbol 
                      name={isShowSaved(show.id, show.traktId) ? "bookmark.fill" : "bookmark"} 
                      size={18} 
                      color={tokens.colors.pureWhite} 
                    />
                  </Pressable>

                  {friendCount > 0 && (
                    <View style={styles.friendsBar}>
                      <View style={styles.friendAvatars}>
                        {friendsWatching.map((user, index) => (
                          <Image
                            key={user.id}
                            source={{ uri: user.avatar }}
                            style={[styles.friendAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                          />
                        ))}
                      </View>
                      <View style={styles.friendsWatchingTextContainer}>
                        <Text style={styles.friendsWatchingNumber}>{friendCount}</Text>
                        <Text style={styles.friendsWatchingLabel}> friends watching</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderYouMayKnow = () => {
    if (suggestedUsers.length === 0) return null;

    return (
      <View style={styles.youMayKnowSection}>
        <Pressable 
          style={styles.sectionHeader}
          onPress={() => router.push('/(tabs)/search?tab=users')}
        >
          <Text style={styles.sectionTitle}>You May Know</Text>
          <ChevronRight size={10} color={tokens.colors.pureWhite} strokeWidth={1} />
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.userCardsScroll}
        >
          {suggestedUsers.map((user) => (
            <Pressable
              key={user.id}
              style={styles.userCard}
              onPress={() => handleUserPress(user.id)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: user.avatar }} style={styles.userProfilePic} />
              <Text style={styles.userCardName} numberOfLines={1}>{user.displayName}</Text>
              <Text style={styles.userCardUsername} numberOfLines={1}>@{user.username}</Text>
              <Friends 
                state="FriendsInCommonBar"
                prop="Small"
                friends={user.mutualFriends}
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const activityData = useMemo(() => {
    const homeFeed = getHomeFeed();
    
    // Show all activity (user's own posts + friends' posts)
    return homeFeed.filter(item => 
      currentUser.following?.includes(item.post.user.id) || 
      item.post.user.id === currentUser.id
    );
  }, [getHomeFeed, currentUser.following, currentUser.id]);

  const renderFriendActivity = () => {
    const activityPosts = activityData.slice(0, 5);
    const communityPostsToShow = communityPosts.slice(0, Math.max(0, 5 - activityPosts.length));
    
    const blendedActivity = [
      ...activityPosts,
      ...communityPostsToShow.map(post => ({
        post,
        sortTimestamp: post.timestamp,
      }))
    ];

    return (
      <View style={styles.friendActivitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity</Text>
        </View>
        {isLoadingFeed ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : blendedActivity.length > 0 ? (
          blendedActivity.map((item, index) => (
            <FadeInView key={`${item.post.id}-${item.repostContext ? 'repost' : 'post'}-${index}`} delay={index * 50}>
              <PostCard
                post={item.post}
                onLike={() => handleLike(item.post.id)}
                onRepost={() => handleRepost(item.post.id)}
                onShare={() => handleShare(item.post.id)}
                repostContext={item.repostContext}
              />
            </FadeInView>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>Follow friends or explore shows to see activity</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderDivider()}
        {renderWelcome()}
        {renderPostInput()}
        {renderCurrentlyWatching()}
        {renderRecommendedTitles()}
        {renderYouMayKnow()}
        {renderFriendActivity()}
      </ScrollView>

      <PostModal
        visible={postModalVisible}
        onClose={() => {
          setPostModalVisible(false);
          setSelectedShow(null);
        }}
        preselectedShow={selectedShow}
      />

      {selectedShow && (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => setPlaylistModalVisible(false)}
          show={selectedShow}
          traktShow={selectedTraktShow}
          onAddToPlaylist={() => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any,
    }),
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Header - exact Figma specs
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logo: {
    width: 123.2,
    height: 21.6,
  },
  profilePic: {
    width: 36.286,
    height: 36.286,
    borderRadius: 14,
  },
  
  // Divider - exact specs
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.imageStroke,
    marginBottom: 23,
  },
  
  // Welcome section - exact specs
  welcomeSection: {
    gap: 7,
    marginBottom: 29,
  },
  welcomeBack: {
    ...tokens.typography.subtitle,
    color: tokens.colors.almostWhite,
  },
  userName: {
    ...tokens.typography.titleXl,
    color: tokens.colors.pureWhite,
  },
  
  
  // Currently Watching - exact specs
  currentlyWatchingSection: {
    gap: 17,
    marginBottom: 29,
  },
  
  // Recommended Titles - exact specs
  recommendedSection: {
    gap: 17,
    marginBottom: 29,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
  },
  viewMoreButton: {
  },
  viewMoreText: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
  },
  showsScrollView: {
    marginLeft: -20,
    marginRight: -20,
  },
  showsScroll: {
    gap: 9,
    paddingLeft: 20,
    paddingRight: 20,
  },
  showCard: {
    width: 215,
    height: 280,
    position: 'relative',
  },
  posterWrapper: {
    position: 'relative',
    width: 215,
    height: 280,
  },
  showImage: {
    width: 215,
    height: 280,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.imageStroke,
  },
  saveIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  logEpisodeButton: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 191,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.colors.greenHighlight,
    backgroundColor: tokens.colors.greenHighlight,
  },
  logEpisodeButtonText: {
    ...tokens.typography.p3M,
    color: tokens.colors.black,
  },
  friendsBar: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 191,
    height: 38,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  friendAvatars: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  friendsWatchingTextContainer: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendsWatchingNumber: {
    ...tokens.typography.p3M,
    color: tokens.colors.greenHighlight,
  },
  friendsWatchingLabel: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
  },
  
  // You May Know - exact specs
  youMayKnowSection: {
    gap: 16,
    marginBottom: 29,
  },
  userCardsScroll: {
    gap: 10,
    paddingRight: 20,
  },
  userCard: {
    width: 114,
    paddingVertical: 12,
    paddingHorizontal: 11,
    gap: 10,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
    alignItems: 'center',
  },
  userProfilePic: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.imageStroke,
  },
  userCardName: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    textAlign: 'center',
  },
  userCardUsername: {
    ...tokens.typography.p3M,
    color: tokens.colors.greenHighlight,
    textAlign: 'center',
  },
  friendsWatchingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  friendsAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.25,
    borderColor: tokens.colors.almostWhite,
  },
  countBadge: {
    backgroundColor: tokens.colors.tabBack4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    ...tokens.typography.p4,
    color: tokens.colors.black,
  },
  
  // Activity - exact specs
  friendActivitySection: {
    gap: 17,
    marginBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.almostWhite,
    marginBottom: 8,
  },
  emptyText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
});
