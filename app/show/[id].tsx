
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import { mockShows, mockEpisodes, mockUsers, currentUser } from '@/data/mockData';
import { Episode } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Search, ChevronDown, ChevronUp } from 'lucide-react-native';

type Tab = 'friends' | 'all' | 'episodes';
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
  const [activeTab, setActiveTab] = useState<Tab>('friends');
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
            color="#FFFFFF" 
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
        style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
        onPress={() => setSortBy('recent')}
      >
        <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextActive]}>
          Recent
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'hot' && styles.sortButtonActive]}
        onPress={() => setSortBy('hot')}
      >
        <Text style={[styles.sortText, sortBy === 'hot' && styles.sortTextActive]}>Hot</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEpisodeRow = (episode: Episode) => (
    <Pressable
      key={episode.id}
      style={styles.episodeRow}
      onPress={() => handleEpisodePress(episode)}
    >
      {/* Episode Thumbnail */}
      <Image 
        source={{ uri: episode.thumbnail || 'https://images.unsplash.com/photo-1574267432644-f610f5b7e4d1?w=300&h=200&fit=crop' }} 
        style={styles.episodeThumbnail}
      />
      
      {/* Episode Info */}
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeNumber}>
          S{episode.seasonNumber.toString().padStart(2, '0')}E{episode.episodeNumber.toString().padStart(2, '0')} {episode.title}
        </Text>
        <Text style={styles.episodeDescription} numberOfLines={1}>
          {episode.description}
        </Text>
        <View style={styles.episodeStats}>
          <View style={styles.episodeStat}>
            <IconSymbol name="star.fill" size={12} color={colors.secondary} />
            <Text style={styles.episodeStatText}>{episode.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.episodeStat}>
            <IconSymbol name="bubble.left.fill" size={12} color={colors.textSecondary} />
            <Text style={styles.episodeStatText}>{episode.postCount} posts</Text>
          </View>
        </View>
      </View>
    </Pressable>
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
    padding: 16,
    backgroundColor: colors.card,
  },
  posterWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  headerPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  saveIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    marginBottom: 8,
  },
  showTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  searchButton: {
    padding: 8,
    backgroundColor: colors.highlight,
    borderRadius: 8,
  },
  showDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    borderColor: colors.card,
  },
  friendAvatarPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  friendNameLink: {
    fontWeight: '600',
    color: colors.text,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
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
    paddingBottom: 8,
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
    paddingBottom: 100,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  episodesContainer: {
    padding: 16,
  },
  seasonSection: {
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
  },
  seasonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seasonHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seasonEpisodeCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  episodesList: {
    backgroundColor: colors.background,
  },
  episodeRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  episodeThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: colors.highlight,
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  episodeNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  episodeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  episodeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  episodeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  episodeStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
