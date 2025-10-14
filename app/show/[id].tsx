
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import { mockShows, mockPosts, mockEpisodes } from '@/data/mockData';

type Tab = 'friends' | 'all' | 'episodes';
type SortBy = 'hot' | 'recent';

export default function ShowHub() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [sortBy, setSortBy] = useState<SortBy>('hot');
  const [modalVisible, setModalVisible] = useState(false);

  const show = mockShows.find((s) => s.id === id);
  const showPosts = mockPosts.filter((p) => p.show.id === id);
  const showEpisodes = mockEpisodes.filter((e) => e.showId === id);

  if (!show) {
    return (
      <View style={commonStyles.container}>
        <Text style={commonStyles.text}>Show not found</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Image source={{ uri: show.poster }} style={styles.headerPoster} />
      <View style={styles.headerInfo}>
        <Text style={styles.showTitle}>{show.title}</Text>
        <Text style={styles.showDescription} numberOfLines={3}>
          {show.description}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <IconSymbol name="star.fill" size={16} color={colors.secondary} />
            <Text style={styles.statText}>{show.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.stat}>
            <IconSymbol name="person.2.fill" size={16} color={colors.text} />
            <Text style={styles.statText}>{show.friendsWatching} friends</Text>
          </View>
        </View>
        <Text style={styles.episodeCount}>
          {show.totalSeasons} Seasons • {show.totalEpisodes} Episodes
        </Text>
      </View>
    </View>
  );

  const renderPostButton = () => (
    <Pressable style={styles.postButton} onPress={() => setModalVisible(true)}>
      <IconSymbol name="plus.circle.fill" size={24} color={colors.secondary} />
      <Text style={styles.postButtonText}>Log Episode</Text>
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
      <TouchableOpacity
        style={[styles.tab, activeTab === 'episodes' && styles.tabActive]}
        onPress={() => setActiveTab('episodes')}
      >
        <Text style={[styles.tabText, activeTab === 'episodes' && styles.tabTextActive]}>
          Episodes
        </Text>
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
      {activeTab !== 'episodes' && renderSortOptions()}
      {activeTab === 'episodes' ? (
        showEpisodes.map((episode) => (
          <Pressable
            key={episode.id}
            style={styles.episodeCard}
            onPress={() => router.push(`/episode/${episode.id}`)}
          >
            <View style={styles.episodeHeader}>
              <Text style={styles.episodeTitle}>
                S{episode.seasonNumber}E{episode.episodeNumber}: {episode.title}
              </Text>
              <View style={styles.episodeRating}>
                <IconSymbol name="star.fill" size={14} color={colors.secondary} />
                <Text style={styles.episodeRatingText}>{episode.rating.toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {episode.description}
            </Text>
            <View style={styles.episodeFooter}>
              <Text style={styles.episodePostCount}>{episode.postCount} posts</Text>
              <Pressable
                style={styles.logEpisodeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setModalVisible(true);
                }}
              >
                <Text style={styles.logEpisodeButtonText}>Log</Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      ) : (
        showPosts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: show.title,
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
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.card,
  },
  headerPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  showTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  showDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
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
  episodeCount: {
    fontSize: 12,
    color: colors.textSecondary,
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
  episodeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  episodeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  episodeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  episodeRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  episodeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  episodeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  episodePostCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  logEpisodeButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logEpisodeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
