
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, components, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import TabSelector, { Tab } from '@/components/TabSelector';
import Button from '@/components/Button';
import SortDropdown, { SortOption } from '@/components/SortDropdown';
import FloatingTabBar from '@/components/FloatingTabBar';
import { mockEpisodes, mockShows } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';

type TabKey = 'friends' | 'all';

const FEED_TABS: Tab[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'all', label: 'All' },
];

export default function EpisodeHub() {
  const { id } = useLocalSearchParams();
  const { posts } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [modalVisible, setModalVisible] = useState(false);

  const episode = mockEpisodes.find((e) => e.id === id);
  const show = episode ? mockShows.find((s) => s.id === episode.showId) : undefined;
  const episodePosts = posts.filter((p) => 
    p.episodes?.some((e) => e.id === id)
  );

  if (!episode || !show) {
    return (
      <View style={commonStyles.container}>
        <Stack.Screen options={{ title: 'Episode Not Found' }} />
        <Text style={commonStyles.text}>Episode not found</Text>
      </View>
    );
  }

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.episodeTitle}>
        S{episode.seasonNumber}E{episode.episodeNumber}: {episode.title}
      </Text>
      <Text style={styles.showTitle}>{show.title}</Text>
      <Text style={styles.episodeDescription}>{episode.description}</Text>
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <IconSymbol name="star.fill" size={16} color={colors.greenHighlight} />
          <Text style={styles.statText}>{episode.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.stat}>
          <IconSymbol name="bubble.left.fill" size={16} color={colors.grey1} />
          <Text style={styles.statText}>{episode.postCount} posts</Text>
        </View>
      </View>
    </View>
  );

  const renderPostButton = () => (
    <View style={styles.buttonContainer}>
      <Button 
        variant="primary" 
        size="large"
        fullWidth
        onPress={() => setModalVisible(true)}
      >
        Log Episode
      </Button>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <TabSelector
        tabs={FEED_TABS}
        activeTab={activeTab}
        onTabChange={(tabKey) => setActiveTab(tabKey as TabKey)}
      />
    </View>
  );

  const renderSortOptions = () => (
    <SortDropdown 
      sortBy={sortBy}
      onSortChange={setSortBy}
    />
  );

  const renderFeed = () => (
    <View style={styles.feed}>
      {renderSortOptions()}
      <View style={styles.postsContainer}>
        {episodePosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: `S${episode.seasonNumber}E${episode.episodeNumber}`,
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
      <PostModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        preselectedShow={show}
        preselectedEpisode={episode}
      />
      <FloatingTabBar 
        tabs={[
          { name: 'Home', icon: 'house.fill', route: '/(home)' },
          { name: 'Search', icon: 'magnifyingglass', route: '/search' },
          { name: 'Notifications', icon: 'bell.fill', route: '/notifications' },
          { name: 'Profile', icon: 'person.fill', route: '/profile' },
        ]} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.pageMargin,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
  },
  episodeTitle: {
    ...typography.titleL,
    color: colors.almostWhite,
    marginBottom: spacing.gapSmall,
  },
  showTitle: {
    ...typography.subtitle,
    color: colors.grey1,
    marginBottom: spacing.gapMedium,
  },
  episodeDescription: {
    ...typography.p1,
    color: colors.grey1,
    marginBottom: spacing.gapMedium,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.gapLarge,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
  },
  statText: {
    ...typography.p1Bold,
    color: colors.almostWhite,
  },
  buttonContainer: {
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.gapLarge,
  },
  tabsWrapper: {
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.gapMedium,
  },
  sortWrapper: {
    marginBottom: spacing.gapLarge,
  },
  feed: {
    paddingHorizontal: spacing.pageMargin,
    paddingBottom: 100,
  },
  postsContainer: {
    gap: spacing.gapMedium,
  },
});
