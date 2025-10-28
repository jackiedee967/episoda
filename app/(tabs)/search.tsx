import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Image, Platform, ImageBackground } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import TabSelector, { Tab } from '@/components/TabSelector';
import UserCard from '@/components/UserCard';
import { mockShows, mockUsers, mockComments } from '@/data/mockData';
import { Show, User, Comment } from '@/types';
import PlaylistModal from '@/components/PlaylistModal';
import { useData } from '@/contexts/DataContext';
import PostCard from '@/components/PostCard';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import tokens from '@/styles/tokens';

type SearchCategory = 'shows' | 'users' | 'posts' | 'comments';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { posts, playlists, isShowInPlaylist, followUser, unfollowUser, isFollowing, currentUser } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const initialTab = (params.tab as SearchCategory) || 'shows';
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(initialTab);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  // Check if there's a pre-selected show filter from params
  const preselectedShowId = params.showId as string | undefined;
  const [showFilter, setShowFilter] = useState<string | undefined>(preselectedShowId);
  const preselectedShow = showFilter 
    ? mockShows.find(s => s.id === showFilter) 
    : null;

  // Check if each category has results
  const getResultsCount = (category: SearchCategory): number => {
    const query = searchQuery.toLowerCase();
    if (!query) return 0;

    switch (category) {
      case 'shows':
        return mockShows.filter(show =>
          show.title.toLowerCase().includes(query)
        ).length;
      
      case 'posts':
        let filteredPosts = preselectedShow 
          ? posts.filter(post => post.show.id === preselectedShow.id)
          : posts;
        return filteredPosts.filter(
          post =>
            post.title?.toLowerCase().includes(query) ||
            post.body.toLowerCase().includes(query) ||
            post.show.title.toLowerCase().includes(query)
        ).length;
      
      case 'comments':
        return mockComments.filter(comment =>
          comment.text.toLowerCase().includes(query)
        ).length;
      
      case 'users':
        return mockUsers.filter(
          user =>
            user.displayName.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.bio?.toLowerCase().includes(query)
        ).length;
      
      default:
        return 0;
    }
  };

  const tabs: Tab[] = [
    { key: 'shows', label: 'Shows', hasIndicator: searchQuery.length > 0 && activeCategory !== 'shows' && getResultsCount('shows') > 0 },
    { key: 'posts', label: 'Posts', hasIndicator: searchQuery.length > 0 && activeCategory !== 'posts' && getResultsCount('posts') > 0 },
    { key: 'comments', label: 'Comments', hasIndicator: searchQuery.length > 0 && activeCategory !== 'comments' && getResultsCount('comments') > 0 },
    { key: 'users', label: 'Users', hasIndicator: searchQuery.length > 0 && activeCategory !== 'users' && getResultsCount('users') > 0 },
  ];

  // Filter based on search query and category
  const getFilteredResults = () => {
    const query = searchQuery.toLowerCase();

    switch (activeCategory) {
      case 'posts':
        let filteredPosts = posts;
        // If there's a preselected show, filter posts by that show
        if (preselectedShow) {
          filteredPosts = posts.filter(post => post.show.id === preselectedShow.id);
        }
        // Apply search query
        if (query) {
          filteredPosts = filteredPosts.filter(
            post =>
              post.title?.toLowerCase().includes(query) ||
              post.body.toLowerCase().includes(query) ||
              post.show.title.toLowerCase().includes(query)
          );
        }
        
        // Auto-sort posts by popularity (likes + reposts + comments)
        return filteredPosts.sort((a, b) => {
          const aPopularity = (a.likes || 0) + (a.reposts || 0) + (a.comments || 0);
          const bPopularity = (b.likes || 0) + (b.reposts || 0) + (b.comments || 0);
          return bPopularity - aPopularity;
        });

      case 'comments':
        let filteredComments = mockComments;
        if (query) {
          filteredComments = mockComments.filter(comment =>
            comment.text.toLowerCase().includes(query)
          );
        }
        
        // Auto-sort comments by likes (popularity)
        return filteredComments.sort((a, b) => {
          return (b.likes || 0) - (a.likes || 0);
        });

      case 'shows':
        let filteredShows = mockShows;
        if (query) {
          filteredShows = mockShows.filter(show =>
            show.title.toLowerCase().includes(query)
          );
        }
        
        // Auto-sort shows: first by friendsWatching, then by post count
        return filteredShows.sort((a, b) => {
          // First priority: friends watching (descending)
          if (b.friendsWatching !== a.friendsWatching) {
            return b.friendsWatching - a.friendsWatching;
          }
          
          // Second priority: post count (descending)
          const aPostCount = posts.filter(p => p.show.id === a.id).length;
          const bPostCount = posts.filter(p => p.show.id === b.id).length;
          return bPostCount - aPostCount;
        });

      case 'users':
        let filteredUsers = mockUsers;
        if (query) {
          filteredUsers = mockUsers.filter(
            user =>
              user.displayName.toLowerCase().includes(query) ||
              user.username.toLowerCase().includes(query) ||
              user.bio?.toLowerCase().includes(query)
          );
        }
        
        // Auto-sort users by follower count
        return filteredUsers.sort((a, b) => {
          const aFollowers = a.followers?.length || 0;
          const bFollowers = b.followers?.length || 0;
          return bFollowers - aFollowers;
        });

      default:
        return [];
    }
  };

  const filteredResults = getFilteredResults();

  // Check if show is in any playlist
  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };

  const handleSavePress = (show: Show, e: any) => {
    e.stopPropagation();
    setSelectedShow(show);
    setPlaylistModalVisible(true);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    console.log(`Show ${showId} added to playlist ${playlistId}`);
  };

  const handleRemoveShowFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFilter(undefined);
    router.setParams({ showId: undefined });
  };

  const handleFollowToggle = async (userId: string) => {
    try {
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const renderShowFilter = () => {
    if (!preselectedShow) return null;

    return (
      <View style={styles.filterChipContainer}>
        <View style={styles.filterChip}>
          <Text style={styles.filterChipText}>{preselectedShow.title}</Text>
          <Pressable 
            onPress={handleRemoveShowFilter} 
            style={styles.filterChipClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={tokens.colors.almostWhite} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderResults = () => {
    // Show placeholder when no search query
    if (searchQuery.length === 0) {
      return (
        <View style={styles.searchPlaceholder}>
          <Image 
            source={require('@/assets/search-placeholder.png')} 
            style={styles.placeholderImage}
            resizeMode="contain"
          />
          <Text style={styles.placeholderTitle}>Type to search</Text>
          <Text style={styles.placeholderSubtitle}>
            Search shows, posts, comments or users...
          </Text>
        </View>
      );
    }

    // Show no results when searched but nothing found
    if (filteredResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Image 
            source={require('@/attached_assets/right-pointing-magnifying-glass_1f50e_1761617614380.png')} 
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateText}>No results found</Text>
          <Text style={styles.emptyStateSubtext}>
            Try searching for something else or change category
          </Text>
        </View>
      );
    }

    switch (activeCategory) {
      case 'posts':
        return filteredResults.map((post: any) => (
          <PostCard key={post.id} post={post} />
        ));

      case 'shows':
        return filteredResults.map((show: any) => (
          <Pressable
            key={show.id}
            style={({ pressed }) => [styles.showCard, pressed && styles.pressed]}
            onPress={() => router.push(`/show/${show.id}`)}
          >
            <Image source={{ uri: show.poster }} style={styles.showPoster} />
            <View style={styles.showInfo}>
              <Text style={styles.showTitle}>{show.title}</Text>
              <Text style={styles.showDescription} numberOfLines={2}>
                {show.description}
              </Text>
              <View style={styles.showStats}>
                <View style={styles.stat}>
                  <IconSymbol name="star.fill" size={14} color="#FCD34D" />
                  <Text style={styles.statText}>{show.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.statText}>{show.totalSeasons} Seasons</Text>
                <Text style={styles.statText}>{show.totalEpisodes} Episodes</Text>
              </View>
              {show.friendsWatching > 0 && (
                <View style={styles.friendsRow}>
                  <IconSymbol name="person.2.fill" size={12} color={tokens.colors.grey1} />
                  <Text style={styles.friendsText}>{show.friendsWatching} friends watching</Text>
                </View>
              )}
            </View>
          </Pressable>
        ));

      case 'users':
        return filteredResults.map((user: any) => {
          const isCurrentUserProfile = user.id === currentUser.id;
          
          return (
            <View key={user.id} style={styles.userCardWrapper}>
              <UserCard
                username={user.username}
                displayName={user.displayName}
                bio={user.bio}
                avatar={user.avatar}
                isFollowing={isFollowing(user.id)}
                onPress={() => router.push(`/user/${user.id}`)}
                onFollowPress={() => handleFollowToggle(user.id)}
                showFollowButton={!isCurrentUserProfile}
              />
            </View>
          );
        });

      case 'comments':
        return filteredResults.map((comment: any) => {
          // Find the post this comment belongs to
          const post = posts.find(p => p.id === comment.postId);
          if (!post) return null;

          const timeAgo = formatTimeAgo(comment.timestamp);
          const episodeText = post.episodes && post.episodes.length > 0 
            ? `S${post.episodes[0].seasonNumber} E${post.episodes[0].episodeNumber}`
            : '';

          // Truncate post title and comment
          const postTitle = post.title || 'Untitled';
          const truncatedPostTitle = postTitle.length > 40 ? postTitle.slice(0, 40) + '...' : postTitle;
          const truncatedComment = comment.text.length > 60 ? comment.text.slice(0, 60) + '...' : comment.text;

          return (
            <Pressable
              key={comment.id}
              style={({ pressed }) => [styles.commentCard, pressed && styles.pressed]}
              onPress={() => router.push(`/post/${comment.postId}`)}
            >
              <View style={styles.commentCardContent}>
                <Image source={{ uri: comment.user.avatar }} style={styles.commentAvatar} />
                <View style={styles.commentInfo}>
                  <Text style={styles.commentTextMixed}>
                    <Text style={styles.commentTextGreen}>{comment.user.displayName}</Text>
                    <Text style={styles.commentTextWhite}> commented on post "</Text>
                    <Text style={styles.commentTextWhite}>{truncatedPostTitle}</Text>
                    <Text style={styles.commentTextWhite}>" about </Text>
                    {episodeText && (
                      <>
                        <Text style={styles.commentTextGreen}>{episodeText}</Text>
                        <Text style={styles.commentTextWhite}> of </Text>
                      </>
                    )}
                    <Text style={styles.commentTextGreen}>{post.show.title}</Text>
                    <Text style={styles.commentTextWhite}>:</Text>
                  </Text>
                  <Text style={styles.commentTextMixed}>
                    <Text style={styles.commentTextWhite}>"{truncatedComment}"</Text>
                  </Text>
                  <Text style={styles.commentTime}>{timeAgo}</Text>
                </View>
              </View>
              <Image source={{ uri: post.show.poster }} style={styles.commentShowPoster} />
            </Pressable>
          );
        }).filter(Boolean);

      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.pageContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={tokens.colors.grey1} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor={tokens.colors.grey1}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={tokens.colors.grey1} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.tabSelectorWrapper}>
          <TabSelector
            tabs={tabs}
            activeTab={activeCategory}
            onTabChange={(tabKey) => setActiveCategory(tabKey as SearchCategory)}
            variant="default"
          />
        </View>

        {renderShowFilter()}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>{renderResults()}</View>
        </ScrollView>

      {selectedShow && (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShow(null);
          }}
          show={selectedShow}
          onAddToPlaylist={handleAddToPlaylist}
        />
      )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: tokens.colors.pageBackground,
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
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    ...tokens.typography.p1B,
    color: tokens.colors.pureWhite,
    marginBottom: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Funnel Display',
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  tabSelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  filterChipContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.pageBackground,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
  },
  filterChipText: {
    ...tokens.typography.p1B,
    color: tokens.colors.almostWhite,
  },
  filterChipClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 100,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    width: 40,
    height: 40,
  },
  emptyStateText: {
    ...tokens.typography.titleL,
    color: tokens.colors.almostWhite,
    marginTop: 18,
  },
  emptyStateSubtext: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    marginTop: 8,
    textAlign: 'center',
  },
  searchPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  placeholderImage: {
    width: 300,
    height: 200,
    marginBottom: 24,
  },
  placeholderTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.almostWhite,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    padding: 11,
    gap: 17,
  },
  pressed: {
    opacity: 0.8,
  },
  showPoster: {
    width: 80.34,
    height: 98.79,
    borderRadius: 8,
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.pureWhite,
    marginBottom: 4,
  },
  showDescription: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    lineHeight: 15.6,
    marginBottom: 8,
  },
  showStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...tokens.typography.p3M,
    color: tokens.colors.grey1,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  friendsText: {
    ...tokens.typography.p3M,
    color: tokens.colors.grey1,
  },
  userCardWrapper: {
    marginBottom: 12,
  },
  commentCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  commentCardContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
    alignItems: 'center',
  },
  commentAvatar: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
  },
  commentInfo: {
    flex: 1,
    gap: 5,
  },
  commentTextMixed: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    letterSpacing: -0.24,
  },
  commentTextGreen: {
    fontWeight: '600',
    color: tokens.colors.greenHighlight,
  },
  commentTextWhite: {
    fontWeight: '400',
    color: tokens.colors.pureWhite,
  },
  commentTime: {
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  commentShowPoster: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
});
