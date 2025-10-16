
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Image } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { mockShows, mockUsers } from '@/data/mockData';
import { Show } from '@/types';
import WatchlistModal from '@/components/WatchlistModal';
import { useData } from '@/contexts/DataContext';
import PostCard from '@/components/PostCard';

type SearchCategory = 'posts' | 'comments' | 'shows' | 'users';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { posts } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('shows');
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showsInWatchlist, setShowsInWatchlist] = useState<Set<string>>(new Set());

  // Check if there's a pre-selected show filter from params
  const preselectedShowId = params.showId as string | undefined;
  const preselectedShow = preselectedShowId 
    ? mockShows.find(s => s.id === preselectedShowId) 
    : null;

  const categories: { key: SearchCategory; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'comments', label: 'Comments' },
    { key: 'shows', label: 'Shows' },
    { key: 'users', label: 'Users' },
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
              user.username.toLowerCase().includes(query)
          );
        }
        return filteredUsers;

      default:
        return [];
    }
  };

  const filteredResults = getFilteredResults();

  const handleSavePress = (show: Show, e: any) => {
    e.stopPropagation();
    setSelectedShow(show);
    setWatchlistModalVisible(true);
  };

  const handleAddToWatchlist = (watchlistId: string, showId: string) => {
    setShowsInWatchlist(prev => new Set(prev).add(showId));
    console.log(`Show ${showId} added to watchlist ${watchlistId}`);
  };

  const handleRemoveShowFilter = () => {
    router.setParams({ showId: undefined });
  };

  const renderCategoryTabs = () => (
    <View style={styles.categoryContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map(category => (
          <Pressable
            key={category.key}
            style={[
              styles.categoryTab,
              activeCategory === category.key && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory(category.key)}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === category.key && styles.categoryTabTextActive,
              ]}
            >
              {category.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderShowFilter = () => {
    if (!preselectedShow) return null;

    return (
      <View style={styles.filterChipContainer}>
        <View style={styles.filterChip}>
          <Text style={styles.filterChipText}>{preselectedShow.title}</Text>
          <Pressable onPress={handleRemoveShowFilter} style={styles.filterChipClose}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderResults = () => {
    if (filteredResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol name="magnifyingglass" size={48} color={colors.textSecondary} />
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
            style={({ pressed }) => [styles.showCard, pressed && styles.showCardPressed]}
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
                  name={showsInWatchlist.has(show.id) ? 'bookmark.fill' : 'bookmark'}
                  size={16}
                  color="#FFFFFF"
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
                  <IconSymbol name="person.2.fill" size={14} color={colors.text} />
                  <Text style={styles.statText}>{show.friendsWatching} friends</Text>
                </View>
                <View style={styles.stat}>
                  <IconSymbol name="tv" size={14} color={colors.text} />
                  <Text style={styles.statText}>
                    {show.totalSeasons} season{show.totalSeasons > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ));

      case 'users':
        return filteredResults.map((user: any) => (
          <Pressable
            key={user.id}
            style={({ pressed }) => [styles.userCard, pressed && styles.userCardPressed]}
            onPress={() => router.push(`/user/${user.id}`)}
          >
            <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userDisplayName}>{user.displayName}</Text>
              <Text style={styles.userUsername}>@{user.username}</Text>
              {user.bio && <Text style={styles.userBio}>{user.bio}</Text>}
            </View>
          </Pressable>
        ));

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
            <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeCategory}...`}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {renderCategoryTabs()}
        {renderShowFilter()}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>{renderResults()}</View>
        </ScrollView>
      </View>

      {selectedShow && (
        <WatchlistModal
          visible={watchlistModalVisible}
          onClose={() => {
            setWatchlistModalVisible(false);
            setSelectedShow(null);
          }}
          show={selectedShow}
          onAddToWatchlist={handleAddToWatchlist}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  categoryTabActive: {
    backgroundColor: colors.secondary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTabTextActive: {
    color: colors.background,
  },
  filterChipContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.highlight,
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipClose: {
    padding: 2,
  },
  scrollView: {
    flex: 1,
  },
  resultsContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  showCardPressed: {
    opacity: 0.95,
  },
  posterWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  showPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  showDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  showStats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  userCardPressed: {
    opacity: 0.95,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
