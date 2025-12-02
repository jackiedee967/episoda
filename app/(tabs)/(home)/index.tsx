import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Image, Animated, Platform, ImageBackground, useWindowDimensions, RefreshControl, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import InviteFriendsModal from '@/components/InviteFriendsModal';
import FoundersWelcomeModal from '@/components/FoundersWelcomeModal';
import { LogAShow } from '@/components/LogAShow';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Asset } from 'expo-asset';

const appBackground = Asset.fromModule(require('../../../assets/images/app-background.jpg')).uri;
import { mockShows, mockUsers } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PostCardSkeleton from '@/components/skeleton/PostCardSkeleton';
import FadeInView from '@/components/FadeInView';
import { Friends } from '@/components/Friends';
import { Friends as BaseFriends } from '@/components/ui-pages/base/friends';
import { supabase } from '@/integrations/supabase/client';
import { User, Post } from '@/types';
import { getCommunityPosts } from '@/services/communityPosts';
import { useAppUsageTracker } from '@/hooks/useAppUsageTracker';
import { useFoundersWelcome } from '@/hooks/useFoundersWelcome';
import AvatarImage from '@/components/AvatarImage';

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
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { posts, currentUser, followUser, unfollowUser, isFollowing, allReposts, isShowInPlaylist, playlists, getHomeFeed, ensureShowUuid } = useData();
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Track app usage for one-time invite modal
  const { shouldShowInviteModal, markInviteModalShown } = useAppUsageTracker();
  
  // Track founders welcome modal for first-time users
  const { shouldShowFoundersModal, markFoundersModalShown } = useFoundersWelcome();
  const [showFoundersModal, setShowFoundersModal] = useState(false);

  // Calculate poster dimensions dynamically to show exactly 2.5 posters
  const posterDimensions = useMemo(() => {
    const padding = 40; // 20px left + 20px right
    const gap = 13;
    const contentWidth = screenWidth - padding;
    // Calculate width for 2.5 posters: (width * 2.5) + (gap * 2) = contentWidth
    const cardWidth = Math.floor((contentWidth - (2 * gap)) / 2.5);
    // Clamp between 120-170px for reasonable sizes
    const clampedWidth = Math.max(120, Math.min(170, cardWidth));
    const cardHeight = Math.floor(clampedWidth * 1.5); // 2:3 aspect ratio
    const overlayWidth = clampedWidth - 24; // 12px padding on each side
    
    return {
      cardWidth: clampedWidth,
      cardHeight,
      overlayWidth,
    };
  }, [screenWidth]);

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

  // Show invite modal after 5 minutes of usage (one time only)
  useEffect(() => {
    if (shouldShowInviteModal) {
      setShowInviteModal(true);
    }
  }, [shouldShowInviteModal]);

  // Show founders welcome modal for first-time users
  useEffect(() => {
    if (shouldShowFoundersModal) {
      setShowFoundersModal(true);
    }
  }, [shouldShowFoundersModal]);

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

    const fetchCurrentlyWatching = async () => {
      // Get user's posts only (most recent first)
      const userPosts = posts
        .filter(post => post.user.id === currentUser.id && post.show)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Extract unique shows (most recent first)
      const uniqueShows = new Map();
      
      for (const post of userPosts) {
        if (post.show && !uniqueShows.has(post.show.id)) {
          uniqueShows.set(post.show.id, post.show);
          if (uniqueShows.size >= 6) break;
        }
      }
      
      const shows = Array.from(uniqueShows.values());
      
      // Enrich shows missing endYear with data from Trakt
      const { fetchShowEndYear } = await import('@/services/trakt');
      const enrichedShows = await Promise.all(
        shows.map(async (show) => {
          if (!show.endYear && show.traktId) {
            try {
              const endYear = await fetchShowEndYear(show.traktId, undefined, show.year);
              return { ...show, endYear };
            } catch (err) {
              console.warn(`Failed to fetch endYear for ${show.title}:`, err);
              return show;
            }
          }
          return show;
        })
      );
      
      setCurrentlyWatchingShows(enrichedShows);
    };
    
    fetchCurrentlyWatching();
  }, [currentUser?.id, posts]);

  // Fetch recommended shows - matches explore page approach (fresh trending + friend activity, sorted by rating)
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchRecommendedShows = async () => {
      try {
        // Get traktIds from Currently Watching to exclude them
        const currentlyWatchingTraktIds = new Set(
          currentlyWatchingShows
            .map(show => show.traktId)
            .filter(Boolean)
        );

        const followingIds = currentUser.following || [];
        
        // 1. Get shows from friends' posts (like explore page)
        const friendsPosts = posts.filter(post => 
          followingIds.includes(post.user.id) && post.show
        );

        // Collect unique shows from friends with user info
        const friendShowsMap = new Map<number, { show: any; users: any[] }>();
        for (const post of friendsPosts) {
          const traktId = post.show?.traktId;
          if (!traktId || currentlyWatchingTraktIds.has(traktId)) continue;
          
          const existing = friendShowsMap.get(traktId);
          if (existing) {
            if (!existing.users.find(u => u.id === post.user.id)) {
              existing.users.push(post.user);
            }
          } else {
            friendShowsMap.set(traktId, {
              show: {
                ...post.show,
                rating: post.show.rating || 0
              },
              users: [post.user]
            });
          }
        }

        const friendShows = Array.from(friendShowsMap.values()).map(item => ({
          id: item.show.id || `trakt-${item.show.traktId}`,
          traktId: item.show.traktId,
          title: item.show.title,
          poster: item.show.poster || item.show.posterUrl,
          year: item.show.year,
          endYear: item.show.endYear,
          rating: item.show.rating || 0,
          mutualFriendsWatching: item.users
        }));

        // 2. Fetch fresh trending shows (like explore page does)
        const { getTrendingShows } = await import('@/services/trakt');
        const { showEnrichmentManager } = await import('@/services/showEnrichment');
        const { mapTraktShowToShow } = await import('@/services/showMappers');

        const { data: trending } = await getTrendingShows(12);
        const enrichedTrending = await Promise.all(
          trending.map(async (traktShow) => {
            const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
            const show = mapTraktShowToShow(traktShow, {
              posterUrl: enrichedData.posterUrl,
              totalSeasons: enrichedData.totalSeasons,
              totalEpisodes: traktShow.aired_episodes,
              endYear: enrichedData.endYear
            });
            return {
              ...show,
              id: show.id || `trakt-${traktShow.ids.trakt}`,
              traktId: traktShow.ids.trakt,
              rating: traktShow.rating || 0,
              mutualFriendsWatching: []
            };
          })
        );

        // 3. Mix friend shows + trending, sort by rating (like explore page)
        const seenTraktIds = new Set<number>();
        const mixed = [];

        // Add friend shows first
        for (const show of friendShows) {
          if (!seenTraktIds.has(show.traktId)) {
            seenTraktIds.add(show.traktId);
            mixed.push(show);
          }
        }

        // Add trending shows (excluding duplicates and currently watching)
        for (const show of enrichedTrending) {
          if (!seenTraktIds.has(show.traktId) && !currentlyWatchingTraktIds.has(show.traktId)) {
            seenTraktIds.add(show.traktId);
            mixed.push(show);
          }
        }

        // Sort by rating and take top 10
        const sorted = mixed.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
        setRecommendedShows(sorted);
      } catch (error) {
        console.error('Error fetching recommended shows:', error);
      }
    };

    fetchRecommendedShows();
  }, [currentUser?.id, currentUser?.following, posts, currentlyWatchingShows]);

  useEffect(() => {
    const fetchCommunityPosts = async () => {
      if (!currentUser?.id || isLoadingFeed) return;

      const homeFeed = getHomeFeed();
      const activityPostIds = homeFeed.map(item => item.post.id);
      
      // Load initial batch of community posts (10 posts)
      const rawCommunityPosts = await getCommunityPosts({
        userId: currentUser.id,
        excludedPostIds: activityPostIds,
        limit: 10,
      });
      
      setCommunityPosts(rawCommunityPosts);
      setHasMorePosts(rawCommunityPosts.length === 10);
    };

    fetchCommunityPosts();
  }, [currentUser?.id, currentUser?.following, posts, isLoadingFeed, getHomeFeed]);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMorePosts || !currentUser?.id) return;

    setIsLoadingMore(true);
    try {
      const homeFeed = getHomeFeed();
      const allCurrentPostIds = [
        ...homeFeed.map(item => item.post.id),
        ...communityPosts.map(post => post.id)
      ];
      
      const newPosts = await getCommunityPosts({
        userId: currentUser.id,
        excludedPostIds: allCurrentPostIds,
        limit: 10,
      });
      
      if (newPosts.length > 0) {
        setCommunityPosts(prev => [...prev, ...newPosts]);
        setHasMorePosts(newPosts.length === 10);
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMorePosts, currentUser?.id, communityPosts, getHomeFeed]);

  const handleRefresh = useCallback(async () => {
    if (!currentUser?.id || isLoadingFeed) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setRefreshing(true);
    try {
      // Reload posts from DataContext (this refreshes activity feed data)
      const homeFeed = getHomeFeed();
      const activityPostIds = homeFeed.map(item => item.post.id);
      
      // Reload community posts from scratch
      const rawCommunityPosts = await getCommunityPosts({
        userId: currentUser.id,
        excludedPostIds: activityPostIds,
        limit: 10,
      });
      
      setCommunityPosts(rawCommunityPosts);
      setHasMorePosts(rawCommunityPosts.length === 10);
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser?.id, isLoadingFeed, getHomeFeed]);

  // Silent auto-refresh when page comes into focus (no spinner)
  useFocusEffect(
    useCallback(() => {
      const silentRefresh = async () => {
        if (!currentUser?.id || isLoadingFeed) return;
        
        try {
          const homeFeed = getHomeFeed();
          const activityPostIds = homeFeed.map(item => item.post.id);
          
          // Reload community posts from scratch (no spinner, no haptic)
          const rawCommunityPosts = await getCommunityPosts({
            userId: currentUser.id,
            excludedPostIds: activityPostIds,
            limit: 10,
          });
          
          setCommunityPosts(rawCommunityPosts);
          setHasMorePosts(rawCommunityPosts.length === 10);
        } catch (error) {
          console.error('Error auto-refreshing feed:', error);
        }
      };
      
      silentRefresh();
    }, [currentUser?.id, isLoadingFeed, getHomeFeed])
  );

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
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Image 
        source={require('@/assets/images/8bb62a0a-b050-44de-b77b-ca88fbec6d81.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Pressable onPress={handleProfilePress}>
        <AvatarImage
          uri={currentUser.avatar_url || currentUser.avatar}
          colorSchemeId={currentUser.avatar_color_scheme}
          iconName={currentUser.avatar_icon}
          size={36}
          borderRadius={12}
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

    // Pre-compute friend counts for Currently Watching shows
    const followingIds = currentUser.following || [];
    const currentlyWatchingFriendDataCache = new Map<number, { count: number; users: any[] }>();

    // Single pass over posts to build cache
    for (const post of posts) {
      if (!followingIds.includes(post.user.id) || !post.show?.traktId) continue;
      
      const traktId = post.show.traktId;
      const existing = currentlyWatchingFriendDataCache.get(traktId);
      
      if (existing) {
        // Check if this friend already counted
        if (!existing.users.find(u => u.id === post.user.id)) {
          existing.users.push(post.user);
          existing.count = existing.users.length;
        }
      } else {
        currentlyWatchingFriendDataCache.set(traktId, {
          count: 1,
          users: [post.user]
        });
      }
    }

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
          {currentlyWatchingShows.map((show) => {
            const friendData = currentlyWatchingFriendDataCache.get(show.traktId);
            const mutualFriendsWatching = friendData?.users || [];

            return (
              <Pressable
                key={show.id}
                style={[
                  styles.showCard,
                  { width: posterDimensions.cardWidth },
                  navigatingShowId === show.id && { opacity: 0.5 }
                ]}
                onPress={() => handleShowPress(show)}
                disabled={navigatingShowId === show.id}
              >
                <View style={[styles.posterWrapper, { width: posterDimensions.cardWidth, height: posterDimensions.cardHeight }]}>
                  <Image 
                    source={{ uri: show.poster || 'https://via.placeholder.com/215x280' }}
                    style={[styles.showImage, { width: posterDimensions.cardWidth, height: posterDimensions.cardHeight }]}
                  />
                  
                  {/* Mutual Friends Badge - Top Left */}
                  {mutualFriendsWatching.length > 0 && (
                    <View style={styles.mutualFriendsOverlay}>
                      <BaseFriends
                        prop="Small"
                        state="Mutual_Friends"
                        friends={mutualFriendsWatching}
                      />
                    </View>
                  )}
                  
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
                      name={isShowSaved(show.id, show.traktId) ? "heart.fill" : "heart"} 
                      size={20} 
                      color={tokens.colors.pureWhite} 
                    />
                  </Pressable>

                  <Pressable 
                    style={[styles.logEpisodeButton, { width: posterDimensions.overlayWidth }]}
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

                <Text style={styles.showTitle} numberOfLines={2}>
                  {show.title}
                </Text>
                
                {show.year && (
                  <Text style={styles.showYear}>
                    {show.endYear && show.endYear !== show.year 
                      ? `${show.year} - ${show.endYear}` 
                      : show.year}
                  </Text>
                )}
              </Pressable>
            );
          })}
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
            const mutualFriendsWatching = friendData?.users || [];

            return (
              <Pressable
                key={show.id}
                style={[
                  styles.showCard,
                  { width: posterDimensions.cardWidth },
                  navigatingShowId === show.id && { opacity: 0.5 }
                ]}
                onPress={() => handleShowPress(show)}
                disabled={navigatingShowId === show.id}
              >
                <View style={[styles.posterWrapper, { width: posterDimensions.cardWidth, height: posterDimensions.cardHeight }]}>
                  <Image 
                    source={{ uri: show.poster || 'https://via.placeholder.com/215x280' }}
                    style={[styles.showImage, { width: posterDimensions.cardWidth, height: posterDimensions.cardHeight }]}
                  />
                  
                  {/* Mutual Friends Badge - Top Left */}
                  {mutualFriendsWatching.length > 0 && (
                    <View style={styles.mutualFriendsOverlay}>
                      <BaseFriends
                        prop="Small"
                        state="Mutual_Friends"
                        friends={mutualFriendsWatching}
                      />
                    </View>
                  )}
                  
                  <Pressable 
                    style={({ pressed }) => [
                      styles.saveIcon,
                      pressed ? styles.saveIconPressed : null,
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
                      name={isShowSaved(show.id, show.traktId) ? "heart.fill" : "heart"} 
                      size={20} 
                      color={tokens.colors.pureWhite} 
                    />
                  </Pressable>
                </View>

                <Text style={styles.showTitle} numberOfLines={2}>
                  {show.title}
                </Text>
                
                {show.year && (
                  <Text style={styles.showYear}>
                    {show.endYear && show.endYear !== show.year 
                      ? `${show.year} - ${show.endYear}` 
                      : show.year}
                  </Text>
                )}
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
              <AvatarImage
                uri={user.avatar_url || user.avatar}
                colorSchemeId={user.avatar_color_scheme}
                iconName={user.avatar_icon}
                size={60}
                borderRadius={16}
              />
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
  }, [getHomeFeed, currentUser.following, currentUser.id, posts, allReposts]);

  // Combine activity and community posts for FlatList with chronological sorting
  // Activity posts are already in { post, sortTimestamp, repostContext? } format
  // Community posts need to be wrapped in the same format
  const feedData = useMemo(() => {
    const wrappedCommunityPosts = communityPosts
      .map(post => {
        let timestamp: Date;
        if (post.timestamp instanceof Date) {
          timestamp = post.timestamp;
        } else {
          const parsed = new Date(post.timestamp);
          timestamp = isNaN(parsed.getTime()) ? new Date(0) : parsed;
        }
        return {
          post,
          sortTimestamp: timestamp,
        };
      })
      .filter(item => item.sortTimestamp.getTime() > 0); // Filter out invalid timestamps
    
    // Merge and sort by timestamp (newest first)
    const combined = [...activityData, ...wrappedCommunityPosts];
    return combined.sort((a, b) => {
      const aTime = a.sortTimestamp instanceof Date ? a.sortTimestamp.getTime() : new Date(a.sortTimestamp).getTime();
      const bTime = b.sortTimestamp instanceof Date ? b.sortTimestamp.getTime() : new Date(b.sortTimestamp).getTime();
      return bTime - aTime;
    });
  }, [activityData, communityPosts]);

  const renderFeedItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <FadeInView key={`${item.post.id}-${item.repostContext ? 'repost' : 'post'}-${index}`} delay={Math.min(index * 50, 500)}>
      <PostCard
        post={item.post}
        onLike={() => handleLike(item.post.id)}
        onRepost={() => handleRepost(item.post.id)}
        onShare={() => handleShare(item.post.id)}
        repostContext={item.repostContext}
      />
    </FadeInView>
  ), []);

  const renderListHeader = () => (
    <>
      {renderHeader()}
      {renderDivider()}
      {renderWelcome()}
      {renderPostInput()}
      {renderCurrentlyWatching()}
      {renderRecommendedTitles()}
      {renderYouMayKnow()}
      <View style={styles.friendActivitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friend Activity</Text>
        </View>
      </View>
    </>
  );

  const renderListFooter = () => {
    if (isLoadingFeed) {
      return (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      );
    }
    
    if (feedData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>Follow friends or explore shows to see activity</Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      );
    }

    if (!hasMorePosts && feedData.length > 10) {
      return (
        <View style={styles.endOfFeedContainer}>
          <Text style={styles.endOfFeedText}>You've reached the end</Text>
        </View>
      );
    }

    return null;
  };

  const keyExtractor = useCallback((item: any, index: number) => 
    `${item.post.id}-${item.repostContext ? 'repost' : 'post'}-${index}`, 
  []);

  const handleEndReached = useCallback(() => {
    if (hasMorePosts && !isLoadingMore) {
      loadMorePosts();
    }
  }, [hasMorePosts, isLoadingMore, loadMorePosts]);

  const content = (
    <>
      <FlatList
        data={feedData}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.colors.almostWhite}
            colors={[tokens.colors.almostWhite]}
          />
        }
      />

      <PostModal
        visible={postModalVisible}
        onClose={() => {
          setPostModalVisible(false);
          setSelectedShow(null);
        }}
        preselectedShow={selectedShow}
      />

      {selectedShow ? (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => setPlaylistModalVisible(false)}
          show={selectedShow}
          traktShow={selectedTraktShow}
          onAddToPlaylist={() => {}}
        />
      ) : null}

      <InviteFriendsModal
        visible={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          markInviteModalShown();
        }}
        onInvite={async () => {
          const APP_STORE_URL = 'https://apps.apple.com/app/episoda/idXXXXXXXXX';
          const message = `Check out EPISODA - the app for TV show discussions and recommendations! ${APP_STORE_URL}`;
          
          try {
            const result = await Share.share({
              message: message,
              url: APP_STORE_URL,
            });

            if (result.action === Share.sharedAction) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowInviteModal(false);
              markInviteModalShown();
            }
          } catch (error) {
            console.error('Error sharing:', error);
            if (Platform.OS === 'web') {
              window.alert('Failed to share.');
            } else {
              Alert.alert('Error', 'Failed to share.');
            }
          }
        }}
      />

      <FoundersWelcomeModal
        visible={showFoundersModal}
        onClose={() => {
          setShowFoundersModal(false);
          markFoundersModalShown();
        }}
      />
    </>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <ImageBackground
      source={{ uri: appBackground }}
      style={styles.container}
      resizeMode="cover"
    >
      {content}
    </ImageBackground>
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
    gap: 10,
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
    gap: 13,
    paddingLeft: 20,
    paddingRight: 20,
  },
  showCard: {
    width: 140,
    gap: 6,
  },
  posterWrapper: {
    position: 'relative',
    width: 140,
    height: 210,
  },
  showImage: {
    width: 140,
    height: 210,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.imageStroke,
  },
  saveIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  mutualFriendsOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showTitle: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
    fontSize: 13,
    lineHeight: 16,
  },
  showYear: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.6,
  },
  logEpisodeButton: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 116,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: tokens.colors.greenHighlight,
  },
  logEpisodeButtonText: {
    ...tokens.typography.p3M,
    color: tokens.colors.black,
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
    marginBottom: 12,
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
  endOfFeedContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 20,
  },
  endOfFeedText: {
    ...tokens.typography.p3R,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
});
