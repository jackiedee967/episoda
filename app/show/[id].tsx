import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { spacing, components, commonStyles } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { ChevronLeft } from 'lucide-react-native';
import { SearchDuotoneLine } from '@/components/SearchDuotoneLine';
import SortDropdown, { SortOption } from '@/components/SortDropdown';
import { Vector3Divider } from '@/components/Vector3Divider';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import FriendsWatchingModal from '@/components/FriendsWatchingModal';
import TabSelector, { Tab } from '@/components/TabSelector';
import EpisodeCard from '@/components/EpisodeCard';
import FloatingTabBar from '@/components/FloatingTabBar';
import { mockShows, mockEpisodes, mockUsers } from '@/data/mockData';
import { Episode } from '@/types';
import { useData } from '@/contexts/DataContext';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

type TabKey = 'friends' | 'all' | 'episodes';

interface SeasonData {
  seasonNumber: number;
  episodes: Episode[];
  expanded: boolean;
}

export default function ShowHub() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { posts, isFollowing } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [isInPlaylist, setIsInPlaylist] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | undefined>(undefined);
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const show = mockShows.find((s) => s.id === id);
  const showPosts = posts.filter((p) => p.show.id === id);
  const showEpisodes = mockEpisodes.filter((e) => e.showId === id);
  const friendsWatching = [mockUsers[0], mockUsers[1], mockUsers[2]];

  useEffect(() => {
    if (activeTab === 'episodes' && seasons.length === 0) {
      initializeSeasons();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'friends') {
      setSortBy('recent');
    } else if (activeTab === 'all') {
      setSortBy('hot');
    }
  }, [activeTab]);

  const initializeSeasons = async () => {
    if (loadingEpisodes) return; // Prevent duplicate fetches
    
    setLoadingEpisodes(true);
    
    try {
      // Simulate async fetch with setTimeout to allow React to render loading state
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const seasonMap = new Map<number, Episode[]>();
      
      showEpisodes.forEach(episode => {
        const seasonNum = episode.seasonNumber;
        if (!seasonMap.has(seasonNum)) {
          seasonMap.set(seasonNum, []);
        }
        seasonMap.get(seasonNum)!.push(episode);
      });

      const seasonsData: SeasonData[] = Array.from(seasonMap.entries())
        .map(([seasonNumber, episodes]) => ({
          seasonNumber,
          episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
          expanded: false,
        }))
        .sort((a, b) => a.seasonNumber - b.seasonNumber);

      setSeasons(seasonsData);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    setSeasons(prev => prev.map(season => 
      season.seasonNumber === seasonNumber 
        ? { ...season, expanded: !season.expanded }
        : season
    ));
  };

  const getFilteredAndSortedPosts = () => {
    let filteredPosts = [...showPosts];

    if (activeTab === 'friends') {
      filteredPosts = filteredPosts.filter(post => isFollowing(post.user.id));
    }

    if (sortBy === 'hot') {
      filteredPosts.sort((a, b) => {
        const engagementA = a.likes + a.comments;
        const engagementB = b.likes + b.comments;
        return engagementB - engagementA;
      });
    } else {
      filteredPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    return filteredPosts;
  };

  if (!show) {
    return (
      <View style={commonStyles.container}>
        <Stack.Screen options={{ title: 'Show Not Found', headerShown: false }} />
        <Text style={commonStyles.text}>Show not found</Text>
      </View>
    );
  }

  const handleSearchInShow = () => {
    router.push({
      pathname: '/(tabs)/search',
      params: { showId: show.id },
    });
  };

  const handleEpisodePress = (episode: Episode) => {
    router.push(`/episode/${episode.id}`);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setTimeout(() => {
      setSelectedEpisode(undefined);
    }, 300);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    setIsInPlaylist(true);
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft size={18} color={tokens.colors.pureWhite} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Pressable onPress={handleSearchInShow} style={styles.searchButton}>
        <SearchDuotoneLine />
      </Pressable>
    </View>
  );

  const renderShowInfo = () => (
    <View style={styles.showInfoContainer}>
      <Text style={styles.showTitle}>{show.title}</Text>
      <View style={styles.showDetailsRow}>
        <Image source={{ uri: show.poster }} style={styles.poster} />
        <View style={styles.detailsColumn}>
          <Text style={styles.description} numberOfLines={3}>
            {show.description}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>{show.rating.toFixed(1)}</Text>
              <Text style={styles.starIcon}>★</Text>
            </View>
            <Text style={styles.statText}>{show.totalSeasons} Seasons</Text>
            <Text style={styles.statText}>{show.totalEpisodes} Episodes</Text>
          </View>
          <Pressable style={styles.friendsWatchingBar} onPress={() => setFriendsModalVisible(true)}>
            <View style={styles.friendAvatarsRow}>
              {friendsWatching.slice(0, 4).map((friend, index) => (
                <Image
                  key={friend.id}
                  source={{ uri: friend.avatar }}
                  style={[
                    styles.friendAvatar,
                    { marginLeft: index > 0 ? -8 : 0, zIndex: friendsWatching.length - index }
                  ]}
                />
              ))}
            </View>
            <Text style={styles.friendsWatchingText}>
              <Text style={styles.friendsWatchingNumber}>{friendsWatching.length}</Text> friends watching
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderLogButton = () => (
    <Pressable style={styles.logButton} onPress={() => setModalVisible(true)}>
      <Text style={styles.logButtonText}>Log an episode</Text>
    </Pressable>
  );

  const tabs: Tab[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'all', label: 'Everyone' },
    { key: 'episodes', label: 'Episodes' },
  ];

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TabSelector 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabKey) => setActiveTab(tabKey as TabKey)}
      />
    </View>
  );

  const renderSortDropdown = () => (
    <SortDropdown 
      sortBy={sortBy}
      onSortChange={setSortBy}
    />
  );

  const renderEpisodeRow = (episode: Episode) => (
    <EpisodeCard
      key={episode.id}
      variant="list"
      title={episode.title}
      episodeNumber={`S${episode.seasonNumber.toString().padStart(2, '0')}E${episode.episodeNumber.toString().padStart(2, '0')}`}
      showTitle={show?.title || ''}
      onPress={() => handleEpisodePress(episode)}
    />
  );

  const renderSeasonSection = (season: SeasonData) => (
    <View key={season.seasonNumber} style={styles.seasonSection}>
      <Pressable 
        style={styles.seasonHeader}
        onPress={() => toggleSeason(season.seasonNumber)}
      >
        <Text style={styles.seasonTitle}>
          Season {season.seasonNumber}
        </Text>
        <View style={styles.seasonHeaderRight}>
          <Text style={styles.seasonEpisodeCount}>
            {season.episodes.length} episodes
          </Text>
          {season.expanded ? (
            <ChevronUp size={20} color={tokens.colors.almostWhite} />
          ) : (
            <ChevronDown size={20} color={tokens.colors.almostWhite} />
          )}
        </View>
      </Pressable>

      {season.expanded && (
        <View style={styles.episodesList}>
          {season.episodes.map(episode => renderEpisodeRow(episode))}
        </View>
      )}
    </View>
  );

  const renderFeed = () => {
    const filteredPosts = getFilteredAndSortedPosts();

    return (
      <View style={styles.feedContainer}>
        {activeTab !== 'episodes' && renderSortDropdown()}
        
        {activeTab === 'episodes' ? (
          <View style={styles.episodesContainer}>
            {loadingEpisodes ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              </View>
            ) : seasons.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No episodes available</Text>
              </View>
            ) : (
              seasons.map(season => renderSeasonSection(season))
            )}
          </View>
        ) : (
          <>
            {filteredPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {activeTab === 'friends' 
                    ? 'No posts from friends yet'
                    : 'No posts yet'}
                </Text>
              </View>
            ) : (
              filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: show.title, headerShown: false }} />
      <View style={[commonStyles.container, styles.container]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
          {renderHeader()}
          {renderShowInfo()}
          {renderLogButton()}
          <Vector3Divider />
          {renderTabs()}
          {renderFeed()}
        </ScrollView>
      </View>
      <PostModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        preselectedShow={show}
        preselectedEpisode={selectedEpisode}
      />
      <PlaylistModal
        visible={playlistModalVisible}
        onClose={() => setPlaylistModalVisible(false)}
        show={show}
        onAddToPlaylist={handleAddToPlaylist}
      />
      <FriendsWatchingModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
        friends={friendsWatching}
        showTitle={show.title}
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
  container: {
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any,
    }),
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    height: 31,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 392,
    marginBottom: 21,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '300',
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showInfoContainer: {
    width: '100%',
    maxWidth: 392,
    marginBottom: 21,
  },
  showTitle: {
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  showDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  poster: {
    width: 93,
    height: 119,
    borderRadius: components.borderRadiusButton,
  },
  detailsColumn: {
    flex: 1,
    gap: 11,
  },
  description: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: tokens.colors.grey1,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '300',
  },
  starIcon: {
    color: tokens.colors.greenHighlight,
    fontSize: 10,
  },
  statText: {
    color: tokens.colors.grey1,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '300',
  },
  friendsWatchingBar: {
    flexDirection: 'row',
    height: 25,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
    alignSelf: 'flex-start',
  },
  friendAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tokens.colors.cardBackground,
  },
  friendsWatchingText: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
  },
  friendsWatchingNumber: {
    color: tokens.colors.greenHighlight,
  },
  logButton: {
    width: '100%',
    maxWidth: 392,
    paddingVertical: 11,
    paddingHorizontal: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: tokens.colors.greenHighlight,
    marginBottom: 21,
  },
  logButtonText: {
    color: tokens.colors.black,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 24,
  },
  tabsContainer: {
    width: '100%',
    maxWidth: 392,
    marginBottom: 21,
    alignItems: 'center',
  },
  feedContainer: {
    width: '100%',
    maxWidth: 392,
    gap: 10,
    paddingBottom: 100,
  },
  emptyState: {
    padding: spacing.sectionSpacing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontWeight: '500',
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
  episodesContainer: {
    gap: spacing.gapMedium,
  },
  seasonSection: {
    marginBottom: spacing.gapMedium,
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: components.borderRadiusButton,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    overflow: 'hidden',
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.cardPadding,
    backgroundColor: tokens.colors.cardBackground,
  },
  seasonTitle: {
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontWeight: '500',
    color: tokens.colors.almostWhite,
  },
  seasonHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
  },
  seasonEpisodeCount: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  episodesList: {
    backgroundColor: tokens.colors.pageBackground,
    gap: spacing.gapSmall,
    padding: spacing.gapSmall,
  },
});
