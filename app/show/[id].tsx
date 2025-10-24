
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, components, commonStyles } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import { Vector3Divider } from '@/components/Vector3Divider';
import TabSelector, { Tab } from '@/components/TabSelector';
import EpisodeCard from '@/components/EpisodeCard';
import { mockShows, mockEpisodes, mockUsers, currentUser } from '@/data/mockData';
import { Episode } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Search, ChevronDown, ChevronUp } from 'lucide-react-native';

type TabKey = 'friends' | 'all' | 'episodes';
type SortBy = 'hot' | 'recent';

interface SeasonData {
  seasonNumber: number;
  episodes: Episode[];
  expanded: boolean;
}

const TMDB_API_KEY = 'YOUR_TMDB_API_KEY'; // Replace with actual key or use env variable
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

export default function ShowHub() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { posts, isFollowing } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [sortBy, setSortBy] = useState<SortBy>('recent'); // Friends tab default: Recent
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [isInPlaylist, setIsInPlaylist] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | undefined>(undefined);
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const show = mockShows.find((s) => s.id === id);
  const showPosts = posts.filter((p) => p.show.id === id);
  const showEpisodes = mockEpisodes.filter((e) => e.showId === id);

  // Get friends watching this show (mock data - in real app would come from backend)
  const friendsWatching = [mockUsers[0], mockUsers[1], mockUsers[2]];

  // Initialize seasons when episodes tab is selected
  useEffect(() => {
    if (activeTab === 'episodes' && seasons.length === 0) {
      initializeSeasons();
    }
  }, [activeTab]);

  // Update default sort when tab changes
  useEffect(() => {
    if (activeTab === 'friends') {
      setSortBy('recent'); // Friends tab default: Recent
    } else if (activeTab === 'all') {
      setSortBy('hot'); // All tab default: Hot
    }
  }, [activeTab]);

  const initializeSeasons = () => {
    // Group episodes by season
    const seasonMap = new Map<number, Episode[]>();
    
    showEpisodes.forEach(episode => {
      const seasonNum = episode.seasonNumber;
      if (!seasonMap.has(seasonNum)) {
        seasonMap.set(seasonNum, []);
      }
      seasonMap.get(seasonNum)!.push(episode);
    });

    // Convert to array and sort
    const seasonsData: SeasonData[] = Array.from(seasonMap.entries())
      .map(([seasonNumber, episodes]) => ({
        seasonNumber,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
        expanded: false, // All collapsed by default
      }))
      .sort((a, b) => a.seasonNumber - b.seasonNumber);

    setSeasons(seasonsData);
  };

  const toggleSeason = (seasonNumber: number) => {
    setSeasons(prev => prev.map(season => 
      season.seasonNumber === seasonNumber 
        ? { ...season, expanded: !season.expanded }
        : season
    ));
  };

  // Filter and sort posts based on active tab and sort option
  const getFilteredAndSortedPosts = () => {
    let filteredPosts = [...showPosts];

    // Filter by tab
    if (activeTab === 'friends') {
      // Show only posts from people the current user follows
      filteredPosts = filteredPosts.filter(post => 
        isFollowing(post.user.id)
      );
    }
    // 'all' tab shows all posts (no filtering needed)

    // Sort posts
    if (sortBy === 'hot') {
      // Sort by engagement (likes + comments)
      filteredPosts.sort((a, b) => {
        const engagementA = a.likes + a.comments;
        const engagementB = b.likes + b.comments;
        return engagementB - engagementA;
      });
    } else {
      // Sort by most recent
      filteredPosts.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
    }

    return filteredPosts;
  };

  if (!show) {
    return (
      <View style={commonStyles.container}>
        <Stack.Screen options={{ title: 'Show Not Found' }} />
        <Text style={commonStyles.text}>Show not found</Text>
      </View>
    );
  }

  const handleFriendPress = (friendId: string) => {
    router.push(`/user/${friendId}`);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    setIsInPlaylist(true);
    console.log(`Show ${showId} added to playlist ${playlistId}`);
  };

  const handleLogEpisode = (episode: Episode) => {
    setSelectedEpisode(episode);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    // Reset selected episode after modal closes
    setTimeout(() => {
      setSelectedEpisode(undefined);
    }, 300);
  };

  const handleSearchInShow = () => {
    // Navigate to search tab with this show pre-selected
    router.push({
      pathname: '/(tabs)/search',
      params: { showId: show.id },
    });
  };

  const handleEpisodePress = (episode: Episode) => {
    router.push(`/episode/${episode.id}`);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.posterWrapper}>
        <Image source={{ uri: show.poster }} style={styles.headerPoster} />
        <Pressable 
          style={styles.saveIcon} 
          onPress={() => setPlaylistModalVisible(true)}
        >
          <IconSymbol 
            name={isInPlaylist ? "bookmark.fill" : "bookmark"} 
            size={20} 
            color={tokens.colors.pureWhite} 
          />
        </Pressable>
      </View>
      <View style={styles.headerInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.showTitle}>{show.title}</Text>
          <Pressable style={styles.searchButton} onPress={handleSearchInShow}>
            <Search size={20} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.showDescription} numberOfLines={3}>
          {show.description}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <IconSymbol name="star.fill" size={16} color={colors.secondary} />
            <Text style={styles.statText}>{show.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.friendAvatarsRow}>
              {friendsWatching.slice(0, 3).map((friend, index) => (
                <Pressable
                  key={friend.id}
                  onPress={() => handleFriendPress(friend.id)}
                >
                  {friend.avatar ? (
                    <Image
                      source={{ uri: friend.avatar }}
                      style={[
                        styles.friendAvatar,
                        { marginLeft: index > 0 ? -6 : 0, zIndex: friendsWatching.length - index }
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.friendAvatar,
                        styles.friendAvatarPlaceholder,
                        { marginLeft: index > 0 ? -6 : 0, zIndex: friendsWatching.length - index }
                      ]}
                    >
                      <Text style={styles.friendAvatarPlaceholderText}>
                        {friend.displayName?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            <Text style={styles.statText}>
              <Pressable onPress={() => handleFriendPress(friendsWatching[0].id)}>
                <Text style={styles.friendNameLink}>
                  {friendsWatching[0].displayName}
                </Text>
              </Pressable>
              {show.friendsWatching > 1 && (
                <Text> and {show.friendsWatching - 1} friend{show.friendsWatching - 1 > 1 ? 's' : ''} watching</Text>
              )}
              {show.friendsWatching === 1 && <Text> watching</Text>}
            </Text>
          </View>
        </View>
        <Text style={styles.episodeCount}>
          {show.totalSeasons} Seasons • {show.totalEpisodes} Episodes
        </Text>
      </View>
    </View>
  );

  const renderPostButton = () => (
    <View style={styles.postButtonContainer}>
      <Pressable style={styles.tellYourFriendsButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonLabel}>Tell your friends</Text>
      </Pressable>
    </View>
  );

  const tabs: Tab[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'all', label: 'All' },
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

  const sortTabs: Tab[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'hot', label: 'Hot' },
  ];

  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <TabSelector 
        tabs={sortTabs}
        activeTab={sortBy}
        onTabChange={(tabKey) => setSortBy(tabKey as SortBy)}
      />
    </View>
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
      {/* Season Header */}
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
            <ChevronUp size={20} color={colors.text} />
          ) : (
            <ChevronDown size={20} color={colors.text} />
          )}
        </View>
      </Pressable>

      {/* Episodes List (shown when expanded) */}
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
      <View style={styles.feed}>
        {activeTab !== 'episodes' && renderSortOptions()}
        
        {activeTab === 'episodes' ? (
          // Episodes Tab - Season Dropdowns
          <View style={styles.episodesContainer}>
            {seasons.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No episodes available</Text>
              </View>
            ) : (
              seasons.map(season => renderSeasonSection(season))
            )}
          </View>
        ) : (
          // Friends/All Tabs - Posts Feed
          <>
            {filteredPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {activeTab === 'friends' 
                    ? 'No posts from friends yet. Follow more people to see their posts!'
                    : 'No posts yet. Be the first to post about this show!'}
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
      <Stack.Screen
        options={{
          title: show.title,
        }}
      />
      <View style={commonStyles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderHeader()}
          {renderPostButton()}
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
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: spacing.cardPadding,
    backgroundColor: tokens.colors.cardBackground,
    gap: spacing.gapMedium,
  },
  posterWrapper: {
    position: 'relative',
  },
  headerPoster: {
    width: 120,
    height: 180,
    borderRadius: components.borderRadiusButton,
  },
  saveIcon: {
    position: 'absolute',
    top: spacing.gapSmall,
    right: spacing.gapSmall,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.gapSmall,
  },
  showTitle: {
    flex: 1,
    color: tokens.colors.almostWhite,
    fontFamily: 'Funnel Display',
    fontSize: 25,
    fontWeight: '700',
    marginRight: spacing.gapSmall,
  },
  searchButton: {
    padding: spacing.gapSmall,
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: components.borderRadiusTag,
  },
  showDescription: {
    color: tokens.colors.grey1,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '300',
    marginBottom: spacing.gapMedium,
  },
  statsContainer: {
    flexDirection: 'column',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapSmall,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
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
  friendAvatarPlaceholder: {
    backgroundColor: tokens.colors.tabStroke2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarPlaceholderText: {
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
    color: tokens.colors.pureWhite,
  },
  friendNameLink: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.almostWhite,
  },
  statText: {
    color: tokens.colors.almostWhite,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  episodeCount: {
    color: tokens.colors.grey1,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '300',
  },
  postButtonContainer: {
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.gapMedium,
    alignItems: 'center',
  },
  tellYourFriendsButton: {
    flexDirection: 'row',
    width: 136,
    paddingTop: 11,
    paddingLeft: 34,
    paddingBottom: 11,
    paddingRight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: tokens.colors.greenHighlight,
  },
  buttonLabel: {
    color: tokens.colors.black,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 24,
  },
  tabsContainer: {
    paddingHorizontal: spacing.pageMargin,
    marginBottom: spacing.gapMedium,
    alignItems: 'center',
  },
  sortContainer: {
    paddingHorizontal: spacing.pageMargin,
    paddingBottom: spacing.gapMedium,
    alignItems: 'center',
  },
  feed: {
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
    padding: spacing.pageMargin,
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
