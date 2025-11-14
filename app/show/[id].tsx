import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { spacing, components, commonStyles } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { ChevronLeft } from 'lucide-react-native';
import { SearchDuotoneLine } from '@/components/SearchDuotoneLine';
import { IconSymbol } from '@/components/IconSymbol';
import SortDropdown, { SortOption } from '@/components/SortDropdown';
import { Vector3Divider } from '@/components/Vector3Divider';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import FriendsWatchingModal from '@/components/FriendsWatchingModal';
import TabSelector, { Tab } from '@/components/TabSelector';
import EpisodeCard from '@/components/EpisodeCard';
import EpisodeListCard from '@/components/EpisodeListCard';
import FloatingTabBar from '@/components/FloatingTabBar';
import ShowsEpisodeProgressBar from '@/components/ShowsEpisodeProgressBar';
import { mockShows, mockUsers } from '@/data/mockData';
import { Episode, Show } from '@/types';
import { useData } from '@/contexts/DataContext';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getShowById, DatabaseShow, getEpisodesByShowId, DatabaseEpisode } from '@/services/showDatabase';
import { getAllEpisodes } from '@/services/trakt';
import { getEpisode } from '@/services/tvmaze';
import { getPosterUrl, getBackdropUrl } from '@/utils/posterPlaceholderGenerator';
import { convertToFiveStarRating } from '@/utils/ratingConverter';

type TabKey = 'friends' | 'all' | 'episodes';

interface SeasonData {
  seasonNumber: number;
  episodes: Episode[];
  expanded: boolean;
}

function mapDatabaseShowToShow(dbShow: DatabaseShow): Show {
  return {
    id: dbShow.id,
    title: dbShow.title,
    poster: dbShow.poster_url ?? null,
    backdrop: dbShow.backdrop_url || null,
    description: dbShow.description || 'No description available.',
    rating: dbShow.rating || 0,
    totalSeasons: dbShow.total_seasons || 0,
    totalEpisodes: dbShow.total_episodes || 0,
    friendsWatching: 0,
  };
}

function mapDatabaseEpisodeToEpisode(dbEpisode: DatabaseEpisode): Episode {
  return {
    id: dbEpisode.id,
    showId: dbEpisode.show_id,
    seasonNumber: dbEpisode.season_number,
    episodeNumber: dbEpisode.episode_number,
    title: dbEpisode.title,
    description: dbEpisode.description || 'No description available.',
    rating: dbEpisode.rating || 0,
    postCount: 0,
    thumbnail: dbEpisode.thumbnail_url || undefined,
  };
}

export default function ShowHub() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { posts, isFollowing, currentUser, isShowInPlaylist, playlists } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [isInPlaylist, setIsInPlaylist] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | undefined>(undefined);
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());
  const [loggedEpisodeIds, setLoggedEpisodeIds] = useState<Set<string>>(new Set());
  const [show, setShow] = useState<Show | null>(null);
  const [loadingShow, setLoadingShow] = useState(true);
  const [showError, setShowError] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false);

  const showPosts = useMemo(() => posts.filter((p) => p.show.id === id), [posts, id]);
  
  const showEpisodes = useMemo(() => {
    return episodes.map(episode => ({
      ...episode,
      postCount: posts.filter(post => 
        post.episode?.id === episode.id
      ).length
    }));
  }, [episodes, posts]);
  
  const friendsWatching = useMemo(() => {
    if (!currentUser || !show) return [];
    const friendIds = currentUser.following || [];
    const friendsWhoPosted = posts.filter(post => 
      friendIds.includes(post.user.id) && 
      post.show?.id === show.id
    );
    const uniqueFriendIds = new Set(friendsWhoPosted.map(post => post.user.id));
    const uniqueFriends = friendsWhoPosted
      .filter((post, index, self) => 
        self.findIndex(p => p.user.id === post.user.id) === index
      )
      .map(post => post.user)
      .slice(0, 4);
    return uniqueFriends;
  }, [posts, currentUser, show]);

  // Load previously logged episodes from posts
  useEffect(() => {
    if (!show || !currentUser) {
      setLoggedEpisodeIds(new Set());
      return;
    }

    // Filter posts by current user and this show
    const userShowPosts = posts.filter(
      post => post.user.id === currentUser.id && post.show.id === show.id
    );

    // Extract episode IDs from all posts
    const loggedIds = new Set<string>();
    userShowPosts.forEach(post => {
      // Handle single episode (legacy posts)
      if (post.episode) {
        loggedIds.add(post.episode.id);
      }
      // Handle multiple episodes (new posts)
      if (post.episodes && post.episodes.length > 0) {
        post.episodes.forEach(ep => loggedIds.add(ep.id));
      }
    });

    setLoggedEpisodeIds(loggedIds);
  }, [posts, currentUser, show]);

  useEffect(() => {
    async function loadShow() {
      if (!id || typeof id !== 'string') return;

      setShow(null);
      setLoadingShow(true);
      setShowError(null);

      try {
        const dbShow = await getShowById(id);

        if (dbShow) {
          setShow(mapDatabaseShowToShow(dbShow));
        } else {
          setShowError('Show not found');
        }
      } catch (error) {
        console.error('Error loading show:', error);
        setShowError('Failed to load show');
      } finally {
        setLoadingShow(false);
      }
    }

    loadShow();
  }, [id]);

  useEffect(() => {
    async function loadEpisodes() {
      if (!show?.id) return;
      
      const dbShow = await getShowById(show.id);
      if (!dbShow || !dbShow.trakt_id) {
        console.error('Show not found or missing Trakt ID');
        return;
      }
      
      setSeasons([]);
      setLoadingEpisodes(true);
      try {
        // Fetch all episodes from Trakt API using the service
        const traktEpisodes = await getAllEpisodes(dbShow.trakt_id);
        
        // Map Trakt episodes to Episode type (without thumbnails first for fast display)
        const mappedEpisodes = traktEpisodes.map((ep) => ({
          id: `${dbShow.trakt_id}-S${ep.season}E${ep.number}`,
          showId: show.id,
          seasonNumber: ep.season,
          episodeNumber: ep.number,
          title: ep.title || `Episode ${ep.number}`,
          description: ep.overview || 'No description available.',
          rating: ep.rating || 0,
          postCount: 0,
          thumbnail: undefined,
        }));
        
        setEpisodes(mappedEpisodes);
        setLoadingEpisodes(false);
        
        // Fetch thumbnails in the background if TVMaze ID is available
        if (dbShow.tvmaze_id) {
          const episodesWithThumbnails = await Promise.all(
            mappedEpisodes.map(async (ep) => {
              try {
                const tvmazeEpisode = await getEpisode(
                  dbShow.tvmaze_id!,
                  ep.seasonNumber,
                  ep.episodeNumber
                );
                return {
                  ...ep,
                  thumbnail: tvmazeEpisode?.image?.original || undefined,
                };
              } catch (error) {
                console.error(`Error fetching thumbnail for S${ep.seasonNumber}E${ep.episodeNumber}:`, error);
                return ep;
              }
            })
          );
          
          setEpisodes(episodesWithThumbnails);
        }
      } catch (error) {
        console.error('Error loading episodes:', error);
        setEpisodes([]);
        setLoadingEpisodes(false);
      }
    }

    loadEpisodes();
  }, [show?.id]);

  useEffect(() => {
    if (activeTab === 'episodes' && episodes.length > 0) {
      initializeSeasons();
    }
  }, [activeTab, episodes]);

  useEffect(() => {
    if (activeTab === 'friends') {
      setSortBy('recent');
    } else if (activeTab === 'all') {
      setSortBy('hot');
    }
  }, [activeTab]);

  // Smart auto-tab selection based on content availability
  useEffect(() => {
    if (!show || hasSetInitialTab || !currentUser) return;

    const friendIds = currentUser.following || [];
    const friendPosts = showPosts.filter(post => friendIds.includes(post.user.id));
    const hasFriendPosts = friendPosts.length > 0;
    const hasAnyPosts = showPosts.length > 0;

    // Prioritize: Friends → Everyone → Episodes
    if (hasFriendPosts) {
      setActiveTab('friends');
    } else if (hasAnyPosts) {
      setActiveTab('all');
    } else {
      setActiveTab('episodes');
    }

    setHasSetInitialTab(true);
  }, [show, showPosts, currentUser, hasSetInitialTab]);

  useEffect(() => {
    if (activeTab !== 'episodes') {
      setSelectedEpisodeIds(new Set());
    }
  }, [activeTab]);

  const initializeSeasons = async () => {
    if (showEpisodes.length === 0) return;
    
    try {
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
    } catch (error) {
      console.error('Error initializing seasons:', error);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    setSeasons(prev => prev.map(season => 
      season.seasonNumber === seasonNumber 
        ? { ...season, expanded: !season.expanded }
        : season
    ));
  };

  const toggleEpisodeSelection = (episodeId: string) => {
    setSelectedEpisodeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(episodeId)) {
        newSet.delete(episodeId);
      } else {
        newSet.add(episodeId);
      }
      return newSet;
    });
  };

  const handleLogSelectedEpisodes = () => {
    const episodesToLog = Array.from(selectedEpisodeIds);
    const episodes = showEpisodes.filter(ep => episodesToLog.includes(ep.id));
    
    if (episodes.length > 0) {
      setSelectedEpisode(undefined);
      setModalVisible(true);
    }
  };

  const handlePostSuccess = (postId: string, postedEpisodes: Episode[]) => {
    // Mark only the episodes that were actually included in the post as logged
    setLoggedEpisodeIds(prev => {
      const newSet = new Set(prev);
      postedEpisodes.forEach(episode => {
        newSet.add(episode.id);
      });
      return newSet;
    });
    setSelectedEpisodeIds(new Set());
    
    // Redirect to user's profile posts page
    if (currentUser?.id) {
      router.push(`/user/${currentUser.id}`);
    } else {
      // Fallback to profile tab if currentUser not available
      router.push('/(tabs)/profile');
    }
  };

  const filteredAndSortedPosts = useMemo(() => {
    let filteredPosts = [...showPosts];

    if (activeTab === 'friends') {
      filteredPosts = filteredPosts.filter(post => post.user.id === currentUser.id || isFollowing(post.user.id));
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
  }, [showPosts, activeTab, sortBy, currentUser.id, isFollowing]);

  const handleSearchInShow = () => {
    if (!show) return;
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

  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };

  const renderBanner = () => {
    if (!show) return null;
    const backdropUrl = getBackdropUrl(show.backdrop, show.title);
    return (
      <View style={styles.bannerContainer}>
        <Image 
          source={{ uri: backdropUrl }} 
          style={styles.bannerImage}
          contentFit="cover"
        />
        <View style={styles.bannerOverlay}>
          <Pressable onPress={() => router.back()} style={styles.backButtonOverlay}>
            <ChevronLeft size={18} color={tokens.colors.pureWhite} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Pressable onPress={handleSearchInShow} style={styles.searchButtonOverlay}>
            <SearchDuotoneLine />
          </Pressable>
        </View>
      </View>
    );
  };

  const calculateShowRating = () => {
    const postsWithRatings = showPosts.filter(p => p.rating && p.rating > 0);
    if (postsWithRatings.length === 0) return 0;
    const totalRating = postsWithRatings.reduce((sum, p) => sum + (p.rating || 0), 0);
    return totalRating / postsWithRatings.length;
  };

  const calculateSeasonCount = () => {
    const uniqueSeasons = new Set(showEpisodes.map(ep => ep.seasonNumber));
    return uniqueSeasons.size;
  };

  const calculateEpisodeCount = () => {
    return showEpisodes.length;
  };

  const renderShowInfo = () => {
    const totalSeasons = show.totalSeasons || calculateSeasonCount();
    const totalEpisodes = show.totalEpisodes || calculateEpisodeCount();

    return (
      <View style={styles.showInfoContainer}>
        <View style={styles.showDetailsRow}>
          <View style={styles.posterWrapper}>
            <Image source={{ uri: getPosterUrl(show.poster, show.title) }} style={styles.poster} />
            <Pressable 
              style={({ pressed }) => [
                styles.saveIcon,
                pressed && styles.saveIconPressed,
              ]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPlaylistModalVisible(true);
              }}
            >
              <IconSymbol 
                name={isShowSaved(show.id) ? "bookmark.fill" : "bookmark"} 
                size={18} 
                color={tokens.colors.pureWhite} 
              />
            </Pressable>
          </View>
          <View style={styles.detailsColumn}>
            <Text style={styles.showTitleInside}>{show.title}</Text>
            <Text style={styles.description} numberOfLines={6}>
              {show.description}
            </Text>
            <View style={styles.statsRow}>
              {show.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>
                    {convertToFiveStarRating(show.rating).toFixed(1)}
                  </Text>
                  <Text style={styles.starIcon}>★</Text>
                </View>
              )}
              <Text style={styles.statText}>{totalSeasons} {totalSeasons === 1 ? 'Season' : 'Seasons'}</Text>
              <Text style={styles.statText}>{totalEpisodes} {totalEpisodes === 1 ? 'Episode' : 'Episodes'}</Text>
            </View>
            {friendsWatching.length > 0 && (
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
            )}
          </View>
        </View>
      </View>
    );
  };

  const getMostRecentLoggedEpisode = () => {
    if (loggedEpisodeIds.size === 0) return null;
    
    const loggedEpisodes = showEpisodes.filter(ep => loggedEpisodeIds.has(ep.id));
    
    // Sort by season and episode number to find the most recently released
    loggedEpisodes.sort((a, b) => {
      if (a.seasonNumber !== b.seasonNumber) {
        return b.seasonNumber - a.seasonNumber;
      }
      return b.episodeNumber - a.episodeNumber;
    });
    
    return loggedEpisodes[0];
  };

  const renderProgressBar = () => {
    const mostRecentEpisode = getMostRecentLoggedEpisode();
    const loggedCount = loggedEpisodeIds.size;
    const totalCount = showEpisodes.length;
    
    return (
      <ShowsEpisodeProgressBar
        episodeNumber={mostRecentEpisode ? `S${mostRecentEpisode.seasonNumber} E${mostRecentEpisode.episodeNumber}` : undefined}
        episodeTitle={mostRecentEpisode?.title}
        loggedCount={loggedCount}
        totalCount={totalCount}
        style={styles.progressBar}
      />
    );
  };

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

  const renderEpisodeRow = (episode: Episode) => {
    const episodePosts = posts.filter(p => 
      p.episodes?.some(e => e.id === episode.id)
    );
    const postCount = episodePosts.length;
    const averageRating = episodePosts.length > 0 
      ? episodePosts.reduce((sum, p) => sum + (p.rating || 0), 0) / episodePosts.length 
      : 0;
    
    const isSelected = selectedEpisodeIds.has(episode.id);
    const isLogged = loggedEpisodeIds.has(episode.id);

    return (
      <EpisodeListCard
        key={episode.id}
        episodeNumber={`S${episode.seasonNumber} E${episode.episodeNumber}`}
        title={episode.title}
        description={episode.description}
        rating={averageRating > 0 ? averageRating : undefined}
        postCount={postCount > 0 ? postCount : undefined}
        thumbnail={episode.thumbnail}
        isSelected={isSelected}
        isLogged={isLogged}
        onPress={() => toggleEpisodeSelection(episode.id)}
        onToggleSelect={() => toggleEpisodeSelection(episode.id)}
      />
    );
  };

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
    const filteredPosts = filteredAndSortedPosts;

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
              <View style={styles.emptyPostsState}>
                <Image 
                  source={require('@/attached_assets/posts_placeholder.png')} 
                  style={styles.emptyPostsImage}
                  contentFit="contain"
                />
                <Text style={styles.emptyPostsTitle}>No posts yet</Text>
                <Text style={styles.emptyPostsSubtitle}>
                  No posts yet - invite friends or stay tuned while we grow our community!
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

  if (loadingShow) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...', headerShown: false }} />
        <View style={[commonStyles.container, styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
          <Text style={styles.loadingText}>Loading show...</Text>
        </View>
      </>
    );
  }

  if (showError || !show) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error', headerShown: false }} />
        <View style={[commonStyles.container, styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>{showError || 'Show not found'}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Go Back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: show.title, headerShown: false }} />
      <View style={[commonStyles.container, styles.container]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
          {renderBanner()}
          <View style={styles.contentContainer}>
            {renderShowInfo()}
            {renderProgressBar()}
            {renderLogButton()}
            <Vector3Divider style={styles.divider} />
            {renderTabs()}
            {renderFeed()}
          </View>
        </ScrollView>
      </View>
      <PostModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        preselectedShow={show}
        preselectedEpisode={selectedEpisode}
        preselectedEpisodes={selectedEpisodeIds.size > 0 ? showEpisodes.filter(ep => selectedEpisodeIds.has(ep.id)) : undefined}
        onPostSuccess={handlePostSuccess}
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
        selectionMode={activeTab === 'episodes'}
        selectedCount={selectedEpisodeIds.size}
        onLogPress={handleLogSelectedEpisodes}
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
        backgroundPositionX: 'center',
        backgroundPositionY: '135px',
      } as any,
    }),
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  bannerContainer: {
    height: 160,
    width: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    flex: 1,
    width: '100%',
    height: 160,
  },
  bannerPlaceholder: {
    flex: 1,
    backgroundColor: tokens.colors.cardBackground,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  backButtonOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
  },
  searchButtonOverlay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
  },
  backText: {
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '300',
  },
  showInfoContainer: {
    width: '100%',
    maxWidth: 392,
    marginBottom: 21,
  },
  showTitleInside: {
    ...tokens.typography.titleL,
    color: tokens.colors.pureWhite,
  },
  showDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  posterWrapper: {
    position: 'relative',
    width: 120,
    height: 180,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: components.borderRadiusButton,
  },
  saveIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  detailsColumn: {
    flex: 1,
    gap: 11,
  },
  description: {
    ...tokens.typography.p3R,
    color: tokens.colors.pureWhite,
  },
  divider: {
    marginBottom: 21,
    alignSelf: 'stretch',
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
  progressBar: {
    marginBottom: 10,
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
    alignItems: 'stretch',
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
  emptyPostsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyPostsImage: {
    width: 320,
    height: 240,
    marginBottom: 8,
  },
  emptyPostsTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.pureWhite,
    textAlign: 'center',
  },
  emptyPostsSubtitle: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
    maxWidth: 300,
  },
  episodesContainer: {
    gap: spacing.gapMedium,
  },
  seasonSection: {
    marginBottom: spacing.gapMedium,
    overflow: 'hidden',
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.cardPadding,
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
    gap: spacing.gapSmall,
    padding: spacing.gapSmall,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontWeight: '500',
    color: tokens.colors.almostWhite,
  },
  errorText: {
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontWeight: '500',
    color: tokens.colors.grey1,
    textAlign: 'center',
    marginBottom: 16,
  },
});
