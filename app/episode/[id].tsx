
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import { mockEpisodes, mockPosts, mockShows } from '@/data/mockData';

type Tab = 'friends' | 'all';
type SortBy = 'hot' | 'recent';

export default function EpisodeHub() {
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [sortBy, setSortBy] = useState<SortBy>('hot');
  const [modalVisible, setModalVisible] = useState(false);

  const episode = mockEpisodes.find((e) => e.id === id);
  const show = episode ? mockShows.find((s) => s.id === episode.showId) : null;
  const episodePosts = mockPosts.filter((p) =>
    p.episodes?.some((e) => e.id === id)
  );

  if (!episode || !show) {
    return (
      <View style={commonStyles.container}>
        <Text style={commonStyles.text}>Episode not found</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.episodeNumber}>
        Season {episode.seasonNumber} • Episode {episode.episodeNumber}
      </Text>
      <Text style={styles.episodeTitle}>{episode.title}</Text>
      <Text style={styles.showTitle}>{show.title}</Text>
      <Text style={styles.episodeDescription}>{episode.description}</Text>
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <IconSymbol name="star.fill" size={16} color={colors.secondary} />
          <Text style={styles.statText}>{episode.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.stat}>
          <IconSymbol name="bubble.left.fill" size={16} color={colors.text} />
          <Text style={styles.statText}>{episode.postCount} posts</Text>
        </View>
      </View>
    </View>
  );

  const renderPostButton = () => (
    <Pressable style={styles.postButton} onPress={() => setModalVisible(true)}>
      <IconSymbol name="plus.circle.fill" size={24} color={colors.secondary} />
      <Text style={styles.postButtonText}>Log This Episode</Text>
    </Pressable>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
        onPress={() => setActiveTab('friends')}
      >
        <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
          Friends
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.tabActive]}
        onPress={() => setActiveTab('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'hot' && styles.sortButtonActive]}
        onPress={() => setSortBy('hot')}
      >
        <Text style={[styles.sortText, sortBy === 'hot' && styles.sortTextActive]}>Hot</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
        onPress={() => setSortBy('recent')}
      >
        <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextActive]}>
          Recent
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFeed = () => (
    <View style={styles.feed}>
      {renderSortOptions()}
      {episodePosts.length > 0 ? (
        episodePosts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="bubble.left" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateText}>
            Be the first to share your thoughts about this episode!
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: `S${episode.seasonNumber}E${episode.episodeNumber}`,
          headerBackTitle: 'Back',
          headerTintColor: colors.text,
        }}
      />
      <View style={commonStyles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderHeader()}
          {renderPostButton()}
          {renderTabs()}
          {renderFeed()}
        </ScrollView>
      </View>
      <PostModal visible={modalVisible} onClose={() => setModalVisible(false)} preselectedShow={show} />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: colors.card,
  },
  episodeNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  episodeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  showTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  episodeDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.highlight,
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  sortButtonActive: {
    backgroundColor: colors.highlight,
  },
  sortText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sortTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  feed: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
