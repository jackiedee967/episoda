import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { Asset } from 'expo-asset';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { supabase } from '@/integrations/supabase/client';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import { convertToFiveStarRating } from '@/utils/ratingConverter';
import { getShowColorScheme } from '@/utils/showColors';
import FadeInImage from '@/components/FadeInImage';
import { getEpisode as getTVMazeEpisode, getShowByImdbId, getShowByTvdbId, searchShowByName } from '@/services/tvmaze';
import { getShowDetails } from '@/services/trakt';

type TabKey = 'friends' | 'all';

const FEED_TABS: Tab[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'all', label: 'Everyone' },
];

export default function EpisodeHub() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, isFollowing, currentUser, isShowInPlaylist, playlists } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      
      console.log('📺 Episode Hub loading for ID:', id);
      setIsLoading(true);
      try {
        let episodeData: any = null;
        let showData: any = null;
        
        // First, try direct ID lookup (works for UUID-based IDs)
        const { data: directEpisode, error: directError } = await supabase
          .from('episodes')
          .select('*')
          .eq('id', id)
          .single();

        console.log('📺 Direct lookup result:', { found: !!directEpisode, error: directError?.code });

        if (directEpisode && !directError) {
          episodeData = directEpisode;
          console.log('📺 Found episode via direct lookup, thumbnail_url:', episodeData.thumbnail_url);
        } else {
          // Fallback: Parse Trakt-style ID (format: "traktId-S{season}E{episode}")
          // Example: "41793-S2E1" -> traktId=41793, season=2, episode=1
          const idStr = String(id);
          const match = idStr.match(/^(\d+)-S(\d+)E(\d+)$/);
          console.log('📺 Parsing Trakt-style ID:', idStr, 'Match:', match ? 'yes' : 'no');
          
          if (match) {
            const [, traktId, seasonStr, episodeStr] = match;
            const seasonNum = parseInt(seasonStr, 10);
            const episodeNum = parseInt(episodeStr, 10);
            console.log('📺 Parsed:', { traktId, seasonNum, episodeNum });
            
            // First find the show by trakt_id
            const { data: showByTrakt, error: showError } = await supabase
              .from('shows')
              .select('id')
              .eq('trakt_id', parseInt(traktId, 10))
              .single();
            
            console.log('📺 Show lookup:', { found: !!showByTrakt, showId: showByTrakt?.id, error: showError?.code });
            
            if (showByTrakt) {
              // Now find the episode by show_id + season + episode
              const { data: fallbackEpisode, error: fallbackError } = await supabase
                .from('episodes')
                .select('*')
                .eq('show_id', showByTrakt.id)
                .eq('season_number', seasonNum)
                .eq('episode_number', episodeNum)
                .single();
              
              console.log('📺 Episode lookup:', { 
                found: !!fallbackEpisode, 
                error: fallbackError?.code,
                thumbnail_url: fallbackEpisode?.thumbnail_url 
              });
              
              if (fallbackEpisode && !fallbackError) {
                episodeData = fallbackEpisode;
              }
            }
          }
        }

        if (!episodeData) {
          console.error('Episode not found for id:', id);
          setIsLoading(false);
          return;
        }

        // Fetch show data
        const { data: fetchedShowData, error: showError } = await supabase
          .from('shows')
          .select('*')
          .eq('id', episodeData.show_id)
          .single();

        if (showError || !fetchedShowData) {
          console.error('Error loading show:', showError);
          setIsLoading(false);
          return;
        }
        
        showData = fetchedShowData;

        // Robust thumbnail fetching with multiple fallback strategies
        let thumbnailUrl = episodeData.thumbnail_url;
        if (!thumbnailUrl) {
          console.log('🖼️ Fetching missing episode thumbnail...');
          let tvmazeShowId = showData.tvmaze_id;
          
          // Strategy 1: Use existing TVMaze ID
          if (tvmazeShowId) {
            console.log('📍 Strategy 1: Using stored TVMaze ID:', tvmazeShowId);
          }
          
          // Strategy 2: Look up TVMaze by IMDb ID
          if (!tvmazeShowId && showData.imdb_id) {
            console.log('📍 Strategy 2: Looking up TVMaze by IMDb ID:', showData.imdb_id);
            try {
              const tvmazeShow = await getShowByImdbId(showData.imdb_id);
              if (tvmazeShow) {
                tvmazeShowId = tvmazeShow.id;
                // Save TVMaze ID to database for future use
                await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
                console.log('✅ Found and saved TVMaze ID:', tvmazeShowId);
              }
            } catch (err) {
              console.log('⚠️ IMDb lookup failed:', err);
            }
          }
          
          // Strategy 3: Look up TVMaze by TVDB ID
          if (!tvmazeShowId && showData.tvdb_id) {
            console.log('📍 Strategy 3: Looking up TVMaze by TVDB ID:', showData.tvdb_id);
            try {
              const tvmazeShow = await getShowByTvdbId(showData.tvdb_id);
              if (tvmazeShow) {
                tvmazeShowId = tvmazeShow.id;
                await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
                console.log('✅ Found and saved TVMaze ID:', tvmazeShowId);
              }
            } catch (err) {
              console.log('⚠️ TVDB lookup failed:', err);
            }
          }
          
          // Strategy 4: Get IDs from Trakt API and try again
          if (!tvmazeShowId && showData.trakt_id) {
            console.log('📍 Strategy 4: Fetching IDs from Trakt API...');
            try {
              const traktShow = await getShowDetails(showData.trakt_id);
              const imdbId = traktShow?.ids?.imdb;
              const tvdbId = traktShow?.ids?.tvdb;
              
              // Try IMDb lookup
              if (imdbId) {
                const tvmazeShow = await getShowByImdbId(imdbId);
                if (tvmazeShow) {
                  tvmazeShowId = tvmazeShow.id;
                  // Save all IDs to database
                  await supabase.from('shows').update({ 
                    tvmaze_id: tvmazeShowId,
                    imdb_id: imdbId,
                    tvdb_id: tvdbId || showData.tvdb_id 
                  }).eq('id', showData.id);
                  console.log('✅ Found TVMaze ID via Trakt IMDb:', tvmazeShowId);
                }
              }
              
              // Try TVDB lookup if IMDb failed
              if (!tvmazeShowId && tvdbId) {
                const tvmazeShow = await getShowByTvdbId(tvdbId);
                if (tvmazeShow) {
                  tvmazeShowId = tvmazeShow.id;
                  await supabase.from('shows').update({ 
                    tvmaze_id: tvmazeShowId,
                    tvdb_id: tvdbId 
                  }).eq('id', showData.id);
                  console.log('✅ Found TVMaze ID via Trakt TVDB:', tvmazeShowId);
                }
              }
            } catch (err) {
              console.log('⚠️ Trakt lookup failed:', err);
            }
          }
          
          // Strategy 5: Search TVMaze by show name as last resort
          if (!tvmazeShowId && showData.title) {
            console.log('📍 Strategy 5: Searching TVMaze by title:', showData.title);
            try {
              const tvmazeShow = await searchShowByName(showData.title);
              if (tvmazeShow) {
                tvmazeShowId = tvmazeShow.id;
                await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
                console.log('✅ Found TVMaze ID by name search:', tvmazeShowId);
              }
            } catch (err) {
              console.log('⚠️ Name search failed:', err);
            }
          }
          
          // Now fetch the episode thumbnail using the resolved TVMaze ID
          if (tvmazeShowId) {
            try {
              const tvmazeEpisode = await getTVMazeEpisode(
                tvmazeShowId, 
                episodeData.season_number, 
                episodeData.episode_number
              );
              thumbnailUrl = tvmazeEpisode?.image?.original || null;
              
              // Update database with fetched thumbnail
              if (thumbnailUrl) {
                console.log('✅ Got episode thumbnail:', thumbnailUrl);
                await supabase
                  .from('episodes')
                  .update({ thumbnail_url: thumbnailUrl })
                  .eq('id', episodeData.id);
              } else {
                console.log('⚠️ Episode has no thumbnail on TVMaze');
              }
            } catch (err) {
              console.error('❌ Failed to fetch thumbnail from TVMaze:', err);
            }
          } else {
            console.log('⚠️ Could not resolve TVMaze ID - no thumbnail available');
          }
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
          thumbnail: thumbnailUrl || undefined,
        };

        setEpisode(episodeObj);

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

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setRefreshing(true);
    try {
      let episodeData: any = null;
      let showData: any = null;
      
      // First, try direct ID lookup (works for UUID-based IDs)
      const { data: directEpisode, error: directError } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', id)
        .single();

      if (directEpisode && !directError) {
        episodeData = directEpisode;
      } else {
        // Fallback: Parse Trakt-style ID
        const idStr = String(id);
        const match = idStr.match(/^(\d+)-S(\d+)E(\d+)$/);
        
        if (match) {
          const [, traktId, seasonStr, episodeStr] = match;
          const seasonNum = parseInt(seasonStr, 10);
          const episodeNum = parseInt(episodeStr, 10);
          
          const { data: showByTrakt } = await supabase
            .from('shows')
            .select('id')
            .eq('trakt_id', parseInt(traktId, 10))
            .single();
          
          if (showByTrakt) {
            const { data: fallbackEpisode } = await supabase
              .from('episodes')
              .select('*')
              .eq('show_id', showByTrakt.id)
              .eq('season_number', seasonNum)
              .eq('episode_number', episodeNum)
              .single();
            
            if (fallbackEpisode) {
              episodeData = fallbackEpisode;
            }
          }
        }
      }

      if (!episodeData) {
        console.error('Episode not found for refresh');
        return;
      }

      // Fetch show data
      const { data: fetchedShowData, error: showError } = await supabase
        .from('shows')
        .select('*')
        .eq('id', episodeData.show_id)
        .single();

      if (showError || !fetchedShowData) {
        console.error('Error loading show:', showError);
        return;
      }
      
      showData = fetchedShowData;

      // Robust thumbnail fetching with multiple fallback strategies
      let thumbnailUrl = episodeData.thumbnail_url;
      if (!thumbnailUrl) {
        let tvmazeShowId = showData.tvmaze_id;
        
        // Try multiple strategies to resolve TVMaze ID
        if (!tvmazeShowId && showData.imdb_id) {
          try {
            const tvmazeShow = await getShowByImdbId(showData.imdb_id);
            if (tvmazeShow) {
              tvmazeShowId = tvmazeShow.id;
              await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
            }
          } catch (err) { /* ignore */ }
        }
        
        if (!tvmazeShowId && showData.tvdb_id) {
          try {
            const tvmazeShow = await getShowByTvdbId(showData.tvdb_id);
            if (tvmazeShow) {
              tvmazeShowId = tvmazeShow.id;
              await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
            }
          } catch (err) { /* ignore */ }
        }
        
        if (!tvmazeShowId && showData.trakt_id) {
          try {
            const traktShow = await getShowDetails(showData.trakt_id);
            const imdbId = traktShow?.ids?.imdb;
            if (imdbId) {
              const tvmazeShow = await getShowByImdbId(imdbId);
              if (tvmazeShow) {
                tvmazeShowId = tvmazeShow.id;
                await supabase.from('shows').update({ 
                  tvmaze_id: tvmazeShowId, imdb_id: imdbId 
                }).eq('id', showData.id);
              }
            }
          } catch (err) { /* ignore */ }
        }
        
        if (!tvmazeShowId && showData.title) {
          try {
            const tvmazeShow = await searchShowByName(showData.title);
            if (tvmazeShow) {
              tvmazeShowId = tvmazeShow.id;
              await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
            }
          } catch (err) { /* ignore */ }
        }
        
        if (tvmazeShowId) {
          try {
            const tvmazeEpisode = await getTVMazeEpisode(tvmazeShowId, episodeData.season_number, episodeData.episode_number);
            thumbnailUrl = tvmazeEpisode?.image?.original || null;
            if (thumbnailUrl) {
              await supabase.from('episodes').update({ thumbnail_url: thumbnailUrl }).eq('id', episodeData.id);
            }
          } catch (err) { /* ignore */ }
        }
      }

      const episodeObj: Episode = {
        id: episodeData.id,
        showId: episodeData.show_id,
        seasonNumber: episodeData.season_number,
        episodeNumber: episodeData.episode_number,
        title: episodeData.title,
        description: episodeData.description || '',
        rating: episodeData.rating || 0,
        postCount: 0,
        thumbnail: thumbnailUrl || undefined,
      };

      setEpisode(episodeObj);

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
      console.error('Error refreshing episode:', error);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  // Silent auto-refresh when page comes into focus (no spinner)
  useFocusEffect(
    useCallback(() => {
      const silentRefresh = async () => {
        if (!id) return;
        
        try {
          let episodeData: any = null;
          let showData: any = null;
          
          // First, try direct ID lookup (works for UUID-based IDs)
          const { data: directEpisode, error: directError } = await supabase
            .from('episodes')
            .select('*')
            .eq('id', id)
            .single();

          if (directEpisode && !directError) {
            episodeData = directEpisode;
          } else {
            // Fallback: Parse Trakt-style ID
            const idStr = String(id);
            const match = idStr.match(/^(\d+)-S(\d+)E(\d+)$/);
            
            if (match) {
              const [, traktId, seasonStr, episodeStr] = match;
              const seasonNum = parseInt(seasonStr, 10);
              const episodeNum = parseInt(episodeStr, 10);
              
              const { data: showByTrakt } = await supabase
                .from('shows')
                .select('id')
                .eq('trakt_id', parseInt(traktId, 10))
                .single();
              
              if (showByTrakt) {
                const { data: fallbackEpisode } = await supabase
                  .from('episodes')
                  .select('*')
                  .eq('show_id', showByTrakt.id)
                  .eq('season_number', seasonNum)
                  .eq('episode_number', episodeNum)
                  .single();
                
                if (fallbackEpisode) {
                  episodeData = fallbackEpisode;
                }
              }
            }
          }

          if (!episodeData) return;

          const { data: fetchedShowData, error: showError } = await supabase
            .from('shows')
            .select('*')
            .eq('id', episodeData.show_id)
            .single();

          if (showError || !fetchedShowData) return;
          
          showData = fetchedShowData;

          // Robust thumbnail fetching with multiple fallback strategies (silent)
          let thumbnailUrl = episodeData.thumbnail_url;
          if (!thumbnailUrl) {
            let tvmazeShowId = showData.tvmaze_id;
            
            if (!tvmazeShowId && showData.imdb_id) {
              try {
                const tvmazeShow = await getShowByImdbId(showData.imdb_id);
                if (tvmazeShow) {
                  tvmazeShowId = tvmazeShow.id;
                  await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
                }
              } catch (err) { /* ignore */ }
            }
            
            if (!tvmazeShowId && showData.trakt_id) {
              try {
                const traktShow = await getShowDetails(showData.trakt_id);
                const imdbId = traktShow?.ids?.imdb;
                if (imdbId) {
                  const tvmazeShow = await getShowByImdbId(imdbId);
                  if (tvmazeShow) {
                    tvmazeShowId = tvmazeShow.id;
                    await supabase.from('shows').update({ tvmaze_id: tvmazeShowId, imdb_id: imdbId }).eq('id', showData.id);
                  }
                }
              } catch (err) { /* ignore */ }
            }
            
            if (!tvmazeShowId && showData.title) {
              try {
                const tvmazeShow = await searchShowByName(showData.title);
                if (tvmazeShow) {
                  tvmazeShowId = tvmazeShow.id;
                  await supabase.from('shows').update({ tvmaze_id: tvmazeShowId }).eq('id', showData.id);
                }
              } catch (err) { /* ignore */ }
            }
            
            if (tvmazeShowId) {
              try {
                const tvmazeEpisode = await getTVMazeEpisode(tvmazeShowId, episodeData.season_number, episodeData.episode_number);
                thumbnailUrl = tvmazeEpisode?.image?.original || null;
                if (thumbnailUrl) {
                  await supabase.from('episodes').update({ thumbnail_url: thumbnailUrl }).eq('id', episodeData.id);
                }
              } catch (err) { /* ignore */ }
            }
          }

          const episodeObj: Episode = {
            id: episodeData.id,
            showId: episodeData.show_id,
            seasonNumber: episodeData.season_number,
            episodeNumber: episodeData.episode_number,
            title: episodeData.title,
            description: episodeData.description || '',
            rating: episodeData.rating || 0,
            postCount: 0,
            thumbnail: thumbnailUrl || undefined,
          };

          setEpisode(episodeObj);

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
          console.error('Error auto-refreshing episode:', error);
        }
      };
      
      silentRefresh();
    }, [id])
  );
  
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

  const appBackgroundImage = Asset.fromModule(require('@/assets/images/app-background.jpg'));

  const containerContent = (
    <ScrollView 
      style={styles.scrollView} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={tokens.colors.almostWhite}
          colors={[tokens.colors.almostWhite]}
        />
      }
    >
          {/* Header with Back and Search */}
          <View style={[styles.topBar, { paddingTop: insets.top + 20 }]}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <IconSymbol name="chevron.left" size={16} color={tokens.colors.pureWhite} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Pressable style={styles.searchContainer} onPress={handleSearch}>
              <View style={styles.searchInner}>
                <View style={styles.searchIconWrapper}>
                  <SearchDuotoneLine />
                </View>
              </View>
            </Pressable>
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
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>{episode.title}</Text>
              <Pressable 
                style={({ pressed }) => [
                  styles.heartButton,
                  pressed && styles.heartButtonPressed,
                ]} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPlaylistModalVisible(true);
                }}
              >
                <IconSymbol 
                  name={isShowSaved(show.id) ? "heart.fill" : "heart"} 
                  size={20} 
                  color={isShowSaved(show.id) ? tokens.colors.primaryPink : tokens.colors.pureWhite} 
                />
              </Pressable>
            </View>
            <View style={styles.episodeCard}>
              {episode.thumbnail ? (
                <View style={styles.thumbnailWrapper}>
                  <View style={styles.thumbnailPlaceholder}>
                    <FadeInImage
                      source={{ uri: episode.thumbnail }}
                      style={styles.thumbnail}
                      contentFit="cover"
                      onLoad={() => console.log('📸 Thumbnail loaded:', episode.thumbnail)}
                      onError={(e) => console.log('📸 Thumbnail error:', e)}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.thumbnailWrapper}>
                  <View style={styles.thumbnailPlaceholder} />
                </View>
              )}
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
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {Platform.OS === 'web' ? (
        <View style={styles.container}>
          {containerContent}
        </View>
      ) : (
        <ImageBackground
          source={{ uri: appBackgroundImage.uri }}
          style={styles.container}
          resizeMode="cover"
        >
          {containerContent}
        </ImageBackground>
      )}
      
      <PostModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        preselectedShow={show}
        preselectedEpisode={episode}
      />

      {show ? (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => setPlaylistModalVisible(false)}
          show={show}
          onAddToPlaylist={() => {}}
        />
      ) : null}
      
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  sectionTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.pureWhite,
    flex: 1,
    marginRight: 12,
  },
  heartButton: {
    padding: 4,
  },
  heartButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
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
    padding: 2,
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
