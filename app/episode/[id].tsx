import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import TabSelector, { Tab } from '@/components/TabSelector';
import ButtonL from '@/components/ButtonL';
import PostTags from '@/components/PostTags';
import SortDropdown, { SortOption } from '@/components/SortDropdown';
import { Vector3Divider } from '@/components/Vector3Divider';
import { SearchDuotoneLine } from '@/components/SearchDuotoneLine';
import FloatingTabBar from '@/components/FloatingTabBar';
import { useData } from '@/contexts/DataContext';
import { Episode, Show } from '@/types';
import { supabase } from '@/app/integrations/supabase/client';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import { convertToFiveStarRating } from '@/utils/ratingConverter';
import { getShowColorScheme } from '@/utils/showColors';
import FadeInImage from '@/components/FadeInImage';

type TabKey = 'friends' | 'all';

const FEED_TABS: Tab[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'all', label: 'Everyone' },
];

export default function EpisodeHub() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { posts, isFollowing, currentUser, isShowInPlaylist, playlists } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };

  useEffect(() => {
    if (activeTab === 'friends') {
      setSortBy('recent');
    } else if (activeTab === 'all') {
      setSortBy('hot');
    }
  }, [activeTab]);

  // Fetch episode and show data from Supabase
  useEffect(() => {
    const loadEpisodeData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        // Fetch episode
        const { data: episodeData, error: episodeError } = await supabase
          .from('episodes')
          .select('*')
          .eq('id', id)
          .single();

        if (episodeError || !episodeData) {
          console.error('Error loading episode:', episodeError);
          setIsLoading(false);
          return;
        }

        // Transform episode data
        const episodeObj: Episode = {
          id: episodeData.id,
          showId: episodeData.show_id,
          seasonNumber: episodeData.season_number,
          episodeNumber: episodeData.episode_number,
          title: episodeData.title,
          description: episodeData.description || '',
          rating: episodeData.rating || 0,
          postCount: 0,
          thumbnail: episodeData.thumbnail_url || undefined,
        };

        setEpisode(episodeObj);

        // Fetch show data
        const { data: showData, error: showError } = await supabase
          .from('shows')
          .select('*')
          .eq('id', episodeData.show_id)
          .single();

        if (showError || !showData) {
          console.error('Error loading show:', showError);
          setIsLoading(false);
          return;
        }

        const showObj: Show = {
          id: showData.id,
          title: showData.title,
          year: showData.year,
          poster: showData.poster_url || '',
          totalSeasons: showData.total_seasons || 0,
          genre: showData.genre || '',
          rating: showData.rating || 0,
          traktId: showData.trakt_id,
          colorScheme: showData.color_scheme,
        };
        setShow(showObj);
      } catch (error) {
        console.error('Error loading episode data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEpisodeData();
  }, [id]);
  
  // Get all posts for this episode (unfiltered for rating calculation)
  const allEpisodePosts = useMemo(() => {
    return posts.filter((p) => 
      p.episodes?.some((e) => e.id === id)
    );
  }, [posts, id]);

  // Calculate rating - 10+ posts with ratings = average, else use API rating
  const displayRating = useMemo(() => {
    // Filter to only posts with valid numeric ratings
    const ratedPosts = allEpisodePosts.filter(post => typeof post.rating === 'number' && !isNaN(post.rating));
    
    if (ratedPosts.length >= 10) {
      // Calculate average of user ratings
      const totalRating = ratedPosts.reduce((sum, post) => sum + post.rating, 0);
      return totalRating / ratedPosts.length;
    }
    return episode?.rating || 0;
  }, [allEpisodePosts, episode]);

  // Filter and sort posts based on active tab
  const episodePosts = useMemo(() => {
    let filtered = [...allEpisodePosts];

    if (activeTab === 'friends') {
      filtered = filtered.filter(post => post.user.id === currentUser.id || isFollowing(post.user.id));
    }

    if (sortBy === 'hot') {
      return filtered.sort((a, b) => {
        const engagementA = a.likes + a.comments;
        const engagementB = b.likes + b.comments;
        return engagementB - engagementA;
      });
    } else {
      return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
  }, [allEpisodePosts, activeTab, sortBy, currentUser.id, isFollowing]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
        </View>
      </View>
    );
  }

  if (!episode || !show) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Episode not found</Text>
      </View>
    );
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/search');
  };

  const handleShowPress = () => {
    if (show) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/show/${show.id}`);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header with Back and Search */}
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <IconSymbol name="chevron.left" size={16} color={tokens.colors.pureWhite} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <View style={styles.searchContainer}>
              <View style={styles.searchInner}>
                <View style={styles.searchIconWrapper}>
                  <SearchDuotoneLine />
                </View>
              </View>
            </View>
          </View>

          {/* Show and Episode Tags */}
          <View style={styles.tagsRow}>
            {(() => {
              const showColors = getShowColorScheme(show.traktId, show.colorScheme);
              return (
                <PostTags
                  prop="Large"
                  state="Show_Name"
                  text={show.title}
                  onPress={handleShowPress}
                  primaryColor={showColors.primary}
                  lightColor={showColors.light}
                />
              );
            })()}
            <PostTags
              prop="Large"
              state="S_E_"
              text={`S${episode.seasonNumber} E${episode.episodeNumber}`}
            />
          </View>

          {/* Episode Info Card */}
          <View style={styles.episodeInfoContainer}>
            <Text style={styles.sectionTitle}>{episode.title}</Text>
            <View style={styles.episodeCard}>
              <View style={styles.thumbnailWrapper}>
                <View style={styles.thumbnailPlaceholder}>
                  {episode.thumbnail && (
                    <FadeInImage
                      source={{ uri: episode.thumbnail }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />
                  )}
                </View>
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
                    size={14} 
                    color={tokens.colors.pureWhite} 
                  />
                </Pressable>
              </View>
              <View style={styles.episodeDetails}>
                <Text style={styles.episodeDescription} numberOfLines={3}>
                  {episode.description}
                </Text>
                <View style={styles.episodeStats}>
                  <View style={styles.ratingContainer}>
                    <Star 
                      size={10} 
                      fill={tokens.colors.greenHighlight} 
                      color={tokens.colors.greenHighlight}
                    />
                    <Text style={styles.ratingText}>{convertToFiveStarRating(displayRating).toFixed(1)}</Text>
                  </View>
                  <Text style={styles.postCountText}>{allEpisodePosts.length} post{allEpisodePosts.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Log Button */}
          <View style={styles.buttonContainer}>
            <ButtonL onPress={() => setModalVisible(true)}>
              Log Episode
            </ButtonL>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <Vector3Divider />
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TabSelector
              tabs={FEED_TABS}
              activeTab={activeTab}
              onTabChange={(tabKey) => setActiveTab(tabKey as TabKey)}
            />
          </View>

          {/* Feed with Sort */}
          <View style={styles.feedContainer}>
            <SortDropdown 
              sortBy={sortBy}
              onSortChange={setSortBy}
              style={styles.sortDropdown}
            />
            <View style={styles.postsContainer}>
              {episodePosts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {activeTab === 'friends' ? 'No posts from friends yet' : 'No posts yet'}
                  </Text>
                </View>
              ) : (
                episodePosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
      
      <PostModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        preselectedShow={show}
        preselectedEpisode={episode}
      />

      {show && (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => setPlaylistModalVisible(false)}
          show={show}
          onAddToPlaylist={() => {}}
        />
      )}
      
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
  scrollView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backText: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
  },
  searchContainer: {
    width: 49,
    height: 40,
  },
  searchInner: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  searchIconWrapper: {
    width: 37,
    height: 22,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  episodeInfoContainer: {
    paddingHorizontal: 20,
    paddingTop: 21,
  },
  sectionTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.pureWhite,
    marginBottom: 15,
    width: 258,
  },
  episodeCard: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 122,
    height: 72,
  },
  thumbnailPlaceholder: {
    width: 122,
    height: 72,
    borderRadius: 6,
    backgroundColor: tokens.colors.grey3,
    overflow: 'hidden',
  },
  saveIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  episodeDetails: {
    flex: 1,
    gap: 11,
  },
  episodeDescription: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
  },
  episodeStats: {
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
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  postCountText: {
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 21,
  },
  dividerContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  feedContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  sortDropdown: {
    marginBottom: 10,
  },
  postsContainer: {
    gap: 10,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
  errorText: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
    textAlign: 'center',
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
