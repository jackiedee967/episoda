import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Image } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, components, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import TabSelector, { Tab } from '@/components/TabSelector';
import UserCard from '@/components/UserCard';
import { mockShows, mockUsers } from '@/data/mockData';
import { Show, User } from '@/types';
import PlaylistModal from '@/components/PlaylistModal';
import { useData } from '@/contexts/DataContext';
import PostCard from '@/components/PostCard';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

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

  const tabs: Tab[] = [
    { key: 'shows', label: 'Shows' },
    { key: 'users', label: 'Users' },
    { key: 'posts', label: 'Posts' },
    { key: 'comments', label: 'Comments' },
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
        return filteredPosts;

      case 'comments':
        // In a real app, you'd have a comments array to search through
        return [];

      case 'shows':
        let filteredShows = mockShows;
        if (query) {
          filteredShows = mockShows.filter(show =>
            show.title.toLowerCase().includes(query)
          );
        }
        return filteredShows;

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
        return filteredUsers;

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
            <X size={16} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderResults = () => {
    if (filteredResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol name="magnifyingglass" size={48} color={colors.grey1} />
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
            <View style={styles.posterWrapper}>
              <Image source={{ uri: show.poster }} style={styles.showPoster} />
              <Pressable
                style={({ pressed }) => [
                  styles.saveIcon,
                  pressed && styles.saveIconPressed,
                ]}
                onPress={e => handleSavePress(show, e)}
              >
                <IconSymbol
                  name={isShowSaved(show.id) ? 'bookmark.fill' : 'bookmark'}
                  size={16}
                  color={colors.pureWhite}
                />
              </Pressable>
            </View>
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
                <View style={styles.stat}>
                  <IconSymbol name="person.2.fill" size={14} color={colors.grey1} />
                  <Text style={styles.statText}>{show.friendsWatching} friends</Text>
                </View>
                <View style={styles.stat}>
                  <IconSymbol name="tv" size={14} color={colors.grey1} />
                  <Text style={styles.statText}>
                    {show.totalSeasons} season{show.totalSeasons > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
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
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Comment search coming soon</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={commonStyles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.grey1} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeCategory}...`}
              placeholderTextColor={colors.grey1}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.grey1} />
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
      </View>

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
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.pageMargin,
    paddingTop: 60,
    paddingBottom: spacing.gapLarge,
  },
  title: {
    ...typography.titleXL,
    color: colors.almostWhite,
    marginBottom: spacing.gapLarge,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusButton,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    paddingHorizontal: spacing.gapMedium,
    gap: spacing.gapSmall,
  },
  searchInput: {
    flex: 1,
    ...typography.subtitle,
    color: colors.almostWhite,
    paddingVertical: spacing.gapMedium,
  },
  tabSelectorWrapper: {
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.gapMedium,
  },
  filterChipContainer: {
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.gapMedium,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
    backgroundColor: colors.pageBackground,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusTag * 2.5,
    paddingLeft: spacing.gapMedium + 2,
    paddingRight: 10,
    paddingVertical: spacing.gapSmall,
    gap: spacing.gapSmall,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  filterChipText: {
    ...typography.p1Bold,
    color: colors.almostWhite,
  },
  filterChipClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  resultsContainer: {
    padding: spacing.pageMargin,
    paddingBottom: 100,
    gap: spacing.gapMedium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    ...typography.titleL,
    color: colors.almostWhite,
    marginTop: spacing.gapLarge,
  },
  emptyStateSubtext: {
    ...typography.p1,
    color: colors.grey1,
    marginTop: spacing.gapSmall,
    textAlign: 'center',
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    padding: spacing.gapMedium,
    marginBottom: spacing.gapMedium,
  },
  pressed: {
    opacity: 0.8,
  },
  posterWrapper: {
    position: 'relative',
    marginRight: spacing.gapMedium,
  },
  showPoster: {
    width: 80,
    height: 120,
    borderRadius: components.borderRadiusTag,
  },
  saveIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    ...typography.subtitle,
    color: colors.almostWhite,
    marginBottom: 4,
  },
  showDescription: {
    ...typography.p1,
    color: colors.grey1,
    lineHeight: 20,
    marginBottom: spacing.gapSmall,
  },
  showStats: {
    flexDirection: 'row',
    gap: spacing.gapMedium,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.p2Bold,
    color: colors.grey1,
  },
  userCardWrapper: {
    marginBottom: spacing.gapMedium,
  },
});
