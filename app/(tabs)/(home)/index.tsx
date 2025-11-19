import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, Platform, ImageBackground } from 'react-native';
import { colors, typography } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import { LogAShow } from '@/components/LogAShow';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { mockShows, mockUsers } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { ChevronRight, Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PostCardSkeleton from '@/components/skeleton/PostCardSkeleton';
import FadeInView from '@/components/FadeInView';
import { Friends } from '@/components/Friends';
import { supabase } from '@/app/integrations/supabase/client';
import { User } from '@/types';

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
  const { posts, currentUser, followUser, unfollowUser, isFollowing, allReposts, isShowInPlaylist, playlists, getHomeFeed } = useData();
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [currentlyWatchingShows, setCurrentlyWatchingShows] = useState<any[]>([]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };

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
              style={styles.showCard}
              onPress={() => router.push(`/show/${show.id}`)}
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
                    setPlaylistModalVisible(true);
                  }}
                >
                  <IconSymbol 
                    name={isShowSaved(show.id) ? "bookmark.fill" : "bookmark"} 
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
    const getFriendsWatchingCount = (showId: string) => {
      const friendIds = currentUser.following || [];
      const friendsWhoPosted = posts.filter(post => 
        friendIds.includes(post.user.id) && 
        post.show?.id === showId
      );
      const uniqueFriends = new Set(friendsWhoPosted.map(post => post.user.id));
      return uniqueFriends.size;
    };

    return (
      <View style={styles.recommendedSection}>
        <Pressable 
          style={styles.sectionHeader}
          onPress={() => router.push('/recommended-titles')}
        >
          <Text style={styles.sectionTitle}>Recommended Titles</Text>
          <ChevronRight size={10} color={tokens.colors.pureWhite} strokeWidth={1} />
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.showsScroll}
          style={styles.showsScrollView}
        >
          {mockShows.slice(0, 6).map((show) => {
            const friendCount = getFriendsWatchingCount(show.id);
            const friendsToShow = mockUsers
              .filter(user => currentUser.following?.includes(user.id))
              .slice(0, Math.min(3, friendCount));

            return (
              <Pressable
                key={show.id}
                style={styles.showCard}
                onPress={() => router.push(`/show/${show.id}`)}
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
                      setPlaylistModalVisible(true);
                    }}
                  >
                    <IconSymbol 
                      name={isShowSaved(show.id) ? "bookmark.fill" : "bookmark"} 
                      size={18} 
                      color={tokens.colors.pureWhite} 
                    />
                  </Pressable>

                  {friendCount > 0 && (
                    <View style={styles.friendsBar}>
                      <View style={styles.friendAvatars}>
                        {friendsToShow.map((user, index) => (
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

  const friendActivityData = useMemo(() => {
    const homeFeed = getHomeFeed();
    
    // Filter to only friend activity (posts from followed users)
    return homeFeed.filter(item => currentUser.following?.includes(item.post.user.id));
  }, [getHomeFeed, currentUser.following]);

  const renderFriendActivity = () => {
    const allActivity = friendActivityData;

    return (
      <View style={styles.friendActivitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friend Activity</Text>
        </View>
        {isLoadingFeed ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : allActivity.length > 0 ? (
          allActivity.slice(0, 5).map((item, index) => (
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
            <Text style={styles.emptyTitle}>No friend activity yet</Text>
            <Text style={styles.emptyText}>Follow friends to see what they're watching</Text>
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
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  logEpisodeButtonText: {
    ...tokens.typography.p3M,
    color: tokens.colors.almostWhite,
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
  
  // Friend Activity - exact specs
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
