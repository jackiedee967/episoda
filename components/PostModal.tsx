
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors, spacing, components } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Show, Episode, PostTag } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import PlaylistModal from '@/components/PlaylistModal';
import { useData } from '@/contexts/DataContext';
import { searchShows, getShowSeasons, getSeasonEpisodes, TraktShow, TraktSeason, TraktEpisode } from '@/services/trakt';
import { saveShow, saveEpisode, getShowByTraktId, getShowById } from '@/services/showDatabase';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import EpisodeListCard from '@/components/EpisodeListCard';
import { ChevronUp, ChevronDown, Star } from 'lucide-react-native';
import { getEpisode as getTVMazeEpisode } from '@/services/tvmaze';
import { supabase } from '@/app/integrations/supabase/client';

interface PostModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedShow?: Show;
  preselectedEpisode?: Episode;
  preselectedEpisodes?: Episode[];
  onPostSuccess?: (postId: string, postedEpisodes: Episode[]) => void;
}

type Step = 'selectShow' | 'selectEpisodes' | 'postDetails';

interface Season {
  seasonNumber: number;
  episodes: Episode[];
  expanded: boolean;
}

type RecommendationResult = {
  show: Show;
  traktShow?: TraktShow;
  isDatabaseBacked: boolean;
  traktId: number;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

// HalfStarRating Component
interface HalfStarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

function HalfStarRating({ rating, onRatingChange }: HalfStarRatingProps) {
  const currentRatingRef = useRef(rating);
  
  // Keep ref in sync with prop
  useEffect(() => {
    currentRatingRef.current = rating;
  }, [rating]);

  const handlePress = (value: number) => {
    currentRatingRef.current = value;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRatingChange(value);
  };

  const renderStar = (starNumber: number) => {
    const highlightColor = '#8bfc76';
    const emptyColor = colors.textSecondary;
    
    // Calculate how much of this star should be filled
    const fillAmount = Math.max(0, Math.min(1, rating - (starNumber - 1)));
    
    // Determine star state
    const isFull = fillAmount >= 1;
    const isHalf = fillAmount >= 0.5 && fillAmount < 1;
    const isEmpty = fillAmount < 0.5;
    
    return (
      <View key={starNumber} style={styles.starContainer}>
        {/* Visual star */}
        <View style={styles.starVisual} pointerEvents="none">
          {isEmpty && (
            <Star size={32} color={emptyColor} fill="none" strokeWidth={2} />
          )}
          {isHalf && (
            <View style={styles.starWrapper}>
              <Star size={32} color={emptyColor} fill="none" strokeWidth={2} />
              <View style={styles.halfStarOverlay}>
                <Star size={32} color={highlightColor} fill={highlightColor} strokeWidth={2} />
              </View>
            </View>
          )}
          {isFull && (
            <Star size={32} color={highlightColor} fill={highlightColor} strokeWidth={2} />
          )}
        </View>
        
        {/* Two invisible touch zones for left/right half */}
        <Pressable
          onPress={() => handlePress(starNumber - 0.5)}
          style={styles.touchZoneLeft}
        />
        <Pressable
          onPress={() => handlePress(starNumber)}
          style={styles.touchZoneRight}
        />
      </View>
    );
  };

  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(renderStar)}
    </View>
  );
}

export default function PostModal({ visible, onClose, preselectedShow, preselectedEpisode, preselectedEpisodes, onPostSuccess }: PostModalProps) {
  const { 
    createPost, 
    currentUser, 
    isShowInPlaylist, 
    playlists, 
    posts,
    cachedRecommendations,
    isLoadingRecommendations,
    recommendationsReady,
    loadRecommendations,
  } = useData();
  const [step, setStep] = useState<Step>('selectShow');
  const [selectedShow, setSelectedShow] = useState<Show | null>(preselectedShow || null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Episode[]>([]);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShowForPlaylist, setSelectedShowForPlaylist] = useState<Show | null>(null);
  const [loggedEpisodeIds, setLoggedEpisodeIds] = useState<Set<string>>(new Set());
  
  const [showSearchResults, setShowSearchResults] = useState<Array<{ show: Show; traktShow: TraktShow }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFetchingEpisodes, setIsFetchingEpisodes] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedTraktShow, setSelectedTraktShow] = useState<TraktShow | null>(null);
  const [traktEpisodesMap, setTraktEpisodesMap] = useState<Map<string, TraktEpisode>>(new Map());

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const customTagInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<any>(null);

  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };
  
  // Helper to create deterministic episode key for traktEpisodesMap lookups
  const getEpisodeKey = (episode: Episode): string => {
    return `${episode.showId}-${episode.seasonNumber}-${episode.episodeNumber}`;
  };

  // Can only select tags if post has title or body
  const canSelectTags = postTitle.trim().length > 0 || postBody.trim().length > 0;


  // Load previously logged episodes from posts when show changes
  useEffect(() => {
    if (!selectedShow || !currentUser) {
      setLoggedEpisodeIds(new Set());
      return;
    }

    // Filter posts by current user and selected show
    const userShowPosts = posts.filter(
      post => post.user.id === currentUser.id && post.show.id === selectedShow.id
    );

    // Extract episode keys from all posts (use deterministic format, not UUIDs)
    const loggedIds = new Set<string>();
    userShowPosts.forEach(post => {
      // Handle single episode (legacy posts)
      if (post.episode) {
        loggedIds.add(getEpisodeKey(post.episode));
      }
      // Handle multiple episodes (new posts)
      if (post.episodes && post.episodes.length > 0) {
        post.episodes.forEach(ep => loggedIds.add(getEpisodeKey(ep)));
      }
    });

    setLoggedEpisodeIds(loggedIds);
  }, [posts, currentUser, selectedShow]);

  useEffect(() => {
    if (!visible) return;
    
    // Initialize state from props when modal opens
    setSelectedShow(preselectedShow || null);
    setSelectedEpisodes(preselectedEpisodes || (preselectedEpisode ? [preselectedEpisode] : []));
    
    // Smart step selection based on what's preselected
    if (preselectedShow && (preselectedEpisodes || preselectedEpisode)) {
      // Flow 2: Show and episodes already selected → load Trakt data and skip to review
      console.log('🎬 Loading Trakt data for preselected show and episodes');
      setIsFetchingEpisodes(true);
      setStep('postDetails'); // Set immediately to prevent show selection UI flash
      loadTraktDataForPreselectedShow(preselectedShow, true);
    } else if (preselectedShow) {
      // Flow 1: Show selected but no episodes → fetch episodes and Trakt data, then skip to picker
      console.log('🎬 Loading episodes for preselected show');
      setIsFetchingEpisodes(true);
      setStep('selectEpisodes'); // Set immediately to prevent show selection UI flash
      loadTraktDataForPreselectedShow(preselectedShow, false);
    } else {
      // No preselection → start from show selection
      setStep('selectShow');
    }
  }, [visible, preselectedShow, preselectedEpisode, preselectedEpisodes]);

  // Fallback: if recommendations aren't ready when modal opens, trigger a load
  useEffect(() => {
    if (visible && step === 'selectShow' && !recommendationsReady && !isLoadingRecommendations && currentUser?.id) {
      console.log('📊 Recommendations not ready, triggering fallback load...');
      loadRecommendations({ force: true });
    }
  }, [visible, step, recommendationsReady, isLoadingRecommendations, currentUser?.id, loadRecommendations]);

  const loadTraktDataForPreselectedShow = async (show: Show, skipToReview: boolean) => {
    setIsFetchingEpisodes(true);
    try {
      const { getEpisodesByShowId, getShowById } = await import('@/services/showDatabase');
      const { getShowDetails, getShowSeasons, getSeasonEpisodes } = await import('@/services/trakt');
      const { mapTraktEpisodeToEpisode } = await import('@/services/showMappers');
      
      // First, get the database show record to retrieve trakt_id
      const dbShow = await getShowById(show.id);
      if (!dbShow || !dbShow.trakt_id) {
        console.error('No Trakt ID found for show:', show.id);
        setIsFetchingEpisodes(false);
        setStep('selectShow');
        return;
      }
      
      // Fetch Trakt show data using trakt_id
      const traktShow = await getShowDetails(dbShow.trakt_id);
      setSelectedTraktShow(traktShow);
      console.log('✅ Loaded Trakt show data for preselected show');
      
      // Fetch ALL Trakt episodes to build traktEpisodesMap (required by handlePost)
      // Key by deterministic format: showId-SeasonNumber-EpisodeNumber to match database episode IDs
      const seasonsData = await getShowSeasons(traktShow.ids.trakt);
      const traktEpsMap = new Map<string, TraktEpisode>();
      
      for (const season of seasonsData) {
        if (season.number === 0) continue;
        
        const episodesData = await getSeasonEpisodes(traktShow.ids.trakt, season.number);
        
        for (const episode of episodesData) {
          // Create deterministic key that matches database episode IDs
          const episodeKey = `${show.id}-${episode.season}-${episode.number}`;
          traktEpsMap.set(episodeKey, episode);
        }
      }
      
      setTraktEpisodesMap(traktEpsMap);
      console.log(`✅ Loaded ${traktEpsMap.size} Trakt episodes into map`);
      
      if (skipToReview) {
        // Flow 2: Episodes already provided, skip directly to review
        setIsFetchingEpisodes(false);
        setStep('postDetails');
        return;
      }
      
      // Flow 1: Always fetch ALL episodes from Trakt for episode picker (not just database episodes)
      console.log('Fetching all episodes from Trakt for selection');
      
      const seasonMap = new Map<number, Episode[]>();
      
      for (const season of seasonsData) {
        if (season.number === 0) continue;
        
        const episodesData = await getSeasonEpisodes(traktShow.ids.trakt, season.number);
        console.log(`📺 Fetched ${episodesData.length} episodes for season ${season.number}`);
        
        for (const episode of episodesData) {
          const mappedEpisode = mapTraktEpisodeToEpisode(episode, show.id, null);
          
          if (!seasonMap.has(episode.season)) {
            seasonMap.set(episode.season, []);
          }
          seasonMap.get(episode.season)!.push(mappedEpisode);
        }
      }
      
      let seasonsArray: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
        seasonNumber,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
        expanded: false,
      }));
      
      // Apply smart season expansion based on watch history
      const watchedKeys = await getWatchedEpisodeKeys(show.id);
      const expandIndex = findSeasonToExpand(seasonsArray, watchedKeys);
      if (expandIndex >= 0) {
        seasonsArray[expandIndex].expanded = true;
      }
      
      console.log(`✅ Created ${seasonsArray.length} seasons`);
      
      // Display episodes immediately for fast UI
      setSeasons(seasonsArray);
      setIsFetchingEpisodes(false);
      setStep('selectEpisodes');
      
      // Fetch thumbnails in background if TVMaze ID available (reuse dbShow from earlier)
      if (dbShow && dbShow.tvmaze_id) {
        console.log('📸 Fetching episode thumbnails from TVMaze...');
        const allEpisodes = seasonsArray.flatMap(s => s.episodes);
        const episodesWithThumbnails = await Promise.all(
          allEpisodes.map(async (ep) => {
            try {
              const tvmazeEpisode = await getTVMazeEpisode(
                dbShow.tvmaze_id!,
                ep.seasonNumber,
                ep.episodeNumber
              );
              return {
                ...ep,
                thumbnail: tvmazeEpisode?.image?.original || undefined,
              };
            } catch (error) {
              return ep; // Keep episode without thumbnail on error
            }
          })
        );
        
        // Rebuild seasons with thumbnails
        const thumbnailSeasonMap = new Map<number, Episode[]>();
        episodesWithThumbnails.forEach(ep => {
          if (!thumbnailSeasonMap.has(ep.seasonNumber)) {
            thumbnailSeasonMap.set(ep.seasonNumber, []);
          }
          thumbnailSeasonMap.get(ep.seasonNumber)!.push(ep);
        });
        
        seasonsArray = Array.from(thumbnailSeasonMap.entries()).map(([seasonNumber, episodes]) => ({
          seasonNumber,
          episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
          expanded: false,
        }));
        
        // Reapply smart season expansion after thumbnails loaded
        const watchedKeys = await getWatchedEpisodeKeys(show.id);
        const expandIndex = findSeasonToExpand(seasonsArray, watchedKeys);
        if (expandIndex >= 0) {
          seasonsArray[expandIndex].expanded = true;
        }
        
        setSeasons(seasonsArray);
        console.log('✅ Updated episodes with thumbnails');
      }
    } catch (error) {
      console.error('Error loading data for preselected show:', error);
      setIsFetchingEpisodes(false);
      setStep('selectShow'); // Fall back to show selection
    }
  };

  useEffect(() => {
    if (step === 'selectShow' && visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [step, visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setShowSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResponse = await searchShows(searchQuery);
        const { mapTraktShowToShow } = await import('@/services/showMappers');
        const mappedShows = searchResponse.results.map(result => ({
          show: mapTraktShowToShow(result.show, undefined),
          traktShow: result.show
        }));
        setShowSearchResults(mappedShows);
        setIsSearching(false);
        
        // Background enrichment: fetch posters from TVMaze for better display
        const { getShowByImdbId, getShowByTvdbId } = await import('@/services/tvmaze');
        mappedShows.forEach(async (result, index) => {
          const traktShow = result.traktShow;
          let posterUrl = null;
          
          if (traktShow.ids.imdb) {
            const tvmazeShow = await getShowByImdbId(traktShow.ids.imdb);
            posterUrl = tvmazeShow?.image?.original || null;
          }
          
          if (!posterUrl && traktShow.ids.tvdb) {
            const tvmazeShow = await getShowByTvdbId(traktShow.ids.tvdb);
            posterUrl = tvmazeShow?.image?.original || null;
          }
          
          if (posterUrl) {
            setShowSearchResults(prev => {
              const updated = [...prev];
              if (updated[index]) {
                updated[index] = {
                  ...updated[index],
                  show: {
                    ...updated[index].show,
                    poster: posterUrl
                  }
                };
              }
              return updated;
            });
          }
        });
      } catch (error) {
        console.error('Error searching shows:', error);
        setSearchError('Failed to search shows. Please try again.');
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleRecommendationSelect = async (result: RecommendationResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // For Trakt-only shows, save to database first (lazy persistence)
    if (!result.isDatabaseBacked && result.traktShow) {
      console.log(`💾 Lazy persisting Trakt-only show: ${result.show.title}`);
      try {
        const dbShow = await saveShow(result.traktShow);
        console.log(`✅ Saved show to database: ${dbShow.id}`);
        // Now proceed with the database-backed show
        const { mapDatabaseShowToShow } = await import('@/services/showMappers');
        const mappedShow = mapDatabaseShowToShow(dbShow);
        await handleShowSelect(mappedShow, result.traktShow);
      } catch (error) {
        console.error('❌ Failed to save show to database:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to load show. Please try again.');
      }
    } else if (result.traktShow) {
      // Database-backed show - proceed directly
      await handleShowSelect(result.show, result.traktShow);
    } else {
      // Missing traktShow - refetch from API using stored traktId
      console.warn('⚠️ Missing traktShow for recommendation, refetching...');
      try {
        const { getShowDetails } = await import('@/services/trakt');
        const traktShow = await getShowDetails(result.traktId);
        await handleShowSelect(result.show, traktShow);
      } catch (error) {
        console.error('❌ Failed to refetch show details:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to load show. Please try again.');
      }
    }
  };

  const getWatchedEpisodeKeys = async (showId: string): Promise<Set<string>> => {
    if (!currentUser) return new Set();
    
    try {
      const { data: userPosts, error } = await supabase
        .from('posts')
        .select('episode_ids')
        .eq('user_id', currentUser.id)
        .eq('show_id', showId);
      
      if (error) throw error;
      
      const episodeUUIDs = new Set<string>();
      userPosts?.forEach((post: any) => {
        post.episode_ids?.forEach((id: string) => episodeUUIDs.add(id));
      });
      
      if (episodeUUIDs.size === 0) return new Set();
      
      const { data: episodesData } = await supabase
        .from('episodes')
        .select('season_number, episode_number')
        .in('id', Array.from(episodeUUIDs));
      
      const watchedKeys = new Set<string>();
      episodesData?.forEach((ep: any) => {
        const key = `S${ep.season_number}E${ep.episode_number}`;
        watchedKeys.add(key);
      });
      
      return watchedKeys;
    } catch (error) {
      console.error('Error fetching watched episodes:', error);
      return new Set();
    }
  };

  const findSeasonToExpand = (seasonsData: Season[], watchedKeys: Set<string>): number => {
    if (seasonsData.length === 0) return -1;
    
    for (let i = 0; i < seasonsData.length; i++) {
      const season = seasonsData[i];
      const hasUnwatchedEpisode = season.episodes.some(ep => {
        const key = `S${ep.seasonNumber}E${ep.episodeNumber}`;
        return !watchedKeys.has(key);
      });
      
      if (hasUnwatchedEpisode) {
        return i;
      }
    }
    return seasonsData.length - 1;
  };

  const handleShowSelect = async (show: Show, traktShow: TraktShow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedShow(show);
    setSelectedTraktShow(traktShow);
    setIsFetchingEpisodes(true);
    
    try {
      const traktId = traktShow.ids.trakt;
      const showMappersModule = await import('@/services/showMappers');
      const traktModule = await import('@/services/trakt');
      const mapTraktEpisodeToEpisode = showMappersModule.mapTraktEpisodeToEpisode;
      const getShowSeasons = traktModule.getShowSeasons;
      const getSeasonEpisodes = traktModule.getSeasonEpisodes;
      
      const { data: dbEpisodes } = await supabase
        .from('episodes')
        .select('*')
        .eq('show_id', show.id);
      
      if (dbEpisodes && dbEpisodes.length > 0) {
        console.log(`⚡ Found ${dbEpisodes.length} cached episodes, fetching ALL from Trakt for complete list...`);
        
        const watchedKeys = await getWatchedEpisodeKeys(show.id);
        const seasonsData = await getShowSeasons(traktId);
        const traktEpsMap = new Map<string, TraktEpisode>();
        
        const firstSeason = seasonsData.find(s => s.number > 0);
        if (!firstSeason) {
          console.error('❌ No valid seasons found for this show');
          setIsFetchingEpisodes(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        
        const firstSeasonEpisodes = await getSeasonEpisodes(traktId, firstSeason.number);
        const seasonMap = new Map<number, Episode[]>();
        
        for (const episode of firstSeasonEpisodes) {
          const mappedEpisode = mapTraktEpisodeToEpisode(episode, show.id, null);
          const episodeKey = `${show.id}-${episode.season}-${episode.number}`;
          
          if (!seasonMap.has(episode.season)) {
            seasonMap.set(episode.season, []);
          }
          seasonMap.get(episode.season)!.push(mappedEpisode);
          traktEpsMap.set(episodeKey, episode);
        }
        
        const initialSeasons: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
          seasonNumber,
          episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
          expanded: false,
        }));
        
        if (initialSeasons.length === 0) {
          console.error('❌ No episodes fetched from Trakt, cannot proceed');
          setIsFetchingEpisodes(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        
        const expandIndex = findSeasonToExpand(initialSeasons, watchedKeys);
        if (expandIndex >= 0) {
          initialSeasons[expandIndex].expanded = true;
        }
        
        setSeasons(initialSeasons);
        setTraktEpisodesMap(traktEpsMap);
        setIsFetchingEpisodes(false);
        setStep('selectEpisodes');
        
        const remainingSeasons = seasonsData.filter(s => s.number > 0 && s.number !== firstSeason?.number);
        console.log(`📡 Background loading ${remainingSeasons.length} additional seasons for ${show.title}...`);
        if (remainingSeasons.length > 0) {
          Promise.all(
            remainingSeasons.map(season => 
              getSeasonEpisodes(traktId, season.number).catch(err => {
                console.error(`Failed to load season ${season.number}:`, err);
                return [];
              })
            )
          ).then(allEpisodesData => {
            const updatedSeasonMap = new Map(seasonMap);
            const updatedTraktMap = new Map(traktEpsMap);
            
            allEpisodesData.forEach((episodesData, idx) => {
              const season = remainingSeasons[idx];
              episodesData.forEach(episode => {
                const mappedEpisode = mapTraktEpisodeToEpisode(episode, show.id, null);
                const episodeKey = `${show.id}-${episode.season}-${episode.number}`;
                
                if (!updatedSeasonMap.has(episode.season)) {
                  updatedSeasonMap.set(episode.season, []);
                }
                updatedSeasonMap.get(episode.season)!.push(mappedEpisode);
                updatedTraktMap.set(episodeKey, episode);
              });
            });
            
            const allSeasonsArray: Season[] = Array.from(updatedSeasonMap.entries())
              .sort(([a], [b]) => a - b)
              .map(([seasonNumber, episodes]) => ({
                seasonNumber,
                episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
                expanded: false,
              }));
            
            if (allSeasonsArray.length > 0) {
              const expandIndex = findSeasonToExpand(allSeasonsArray, watchedKeys);
              if (expandIndex >= 0) {
                allSeasonsArray[expandIndex].expanded = true;
              }
              
              setSeasons(allSeasonsArray);
              setTraktEpisodesMap(updatedTraktMap);
              console.log(`✅ Background loaded ${remainingSeasons.length} additional seasons`);
            }
          });
        }
        return;
      }
      
      console.log('📡 Fetching episodes from Trakt API...');
      const seasonsData = await getShowSeasons(traktId);
      const watchedKeys = await getWatchedEpisodeKeys(show.id);
      
      const seasonMap = new Map<number, Episode[]>();
      const traktEpsMap = new Map<string, TraktEpisode>();
      
      const firstSeason = seasonsData.find(s => s.number > 0);
      if (firstSeason) {
        const episodesData = await getSeasonEpisodes(traktId, firstSeason.number);
        
        for (const episode of episodesData) {
          const mappedEpisode = mapTraktEpisodeToEpisode(episode, show.id, null);
          const episodeKey = `${show.id}-${episode.season}-${episode.number}`;
          
          if (!seasonMap.has(episode.season)) {
            seasonMap.set(episode.season, []);
          }
          seasonMap.get(episode.season)!.push(mappedEpisode);
          traktEpsMap.set(episodeKey, episode);
        }
      }
      
      const initialSeasons: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
        seasonNumber,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
        expanded: true,
      }));
      
      if (initialSeasons.length === 0) {
        console.error('❌ No episodes fetched from Trakt, cannot proceed');
        setIsFetchingEpisodes(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      
      setSeasons(initialSeasons);
      setTraktEpisodesMap(traktEpsMap);
      setIsFetchingEpisodes(false);
      setStep('selectEpisodes');
      
      const remainingSeasons = seasonsData.filter(s => s.number > 0 && s.number !== firstSeason?.number);
      console.log(`📡 Background loading ${remainingSeasons.length} additional seasons for ${show.title}...`);
      if (remainingSeasons.length > 0) {
        Promise.all(
          remainingSeasons.map(season => 
            getSeasonEpisodes(traktId, season.number).catch(err => {
              console.error(`Failed to load season ${season.number}:`, err);
              return [];
            })
          )
        ).then(allEpisodesData => {
          const updatedSeasonMap = new Map(seasonMap);
          const updatedTraktMap = new Map(traktEpsMap);
          
          allEpisodesData.forEach((episodesData, idx) => {
            const season = remainingSeasons[idx];
            episodesData.forEach(episode => {
              const mappedEpisode = mapTraktEpisodeToEpisode(episode, show.id, null);
              const episodeKey = `${show.id}-${episode.season}-${episode.number}`;
              
              if (!updatedSeasonMap.has(episode.season)) {
                updatedSeasonMap.set(episode.season, []);
              }
              updatedSeasonMap.get(episode.season)!.push(mappedEpisode);
              updatedTraktMap.set(episodeKey, episode);
            });
          });
          
          const allSeasonsArray: Season[] = Array.from(updatedSeasonMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([seasonNumber, episodes]) => ({
              seasonNumber,
              episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
              expanded: false,
            }));
          
          if (allSeasonsArray.length > 0) {
            const expandIndex = findSeasonToExpand(allSeasonsArray, watchedKeys);
            if (expandIndex >= 0) {
              allSeasonsArray[expandIndex].expanded = true;
            }
            
            setSeasons(allSeasonsArray);
            setTraktEpisodesMap(updatedTraktMap);
            console.log(`✅ Background loaded ${remainingSeasons.length} additional seasons`);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
      setIsFetchingEpisodes(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeasons(seasons.map(season => 
      season.seasonNumber === seasonNumber 
        ? { ...season, expanded: !season.expanded }
        : season
    ));
  };

  const handleEpisodeToggle = (episode: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEpisodes(prev => {
      const isSelected = prev.some(ep => ep.id === episode.id);
      if (isSelected) {
        return prev.filter(ep => ep.id !== episode.id);
      } else {
        return [...prev, episode];
      }
    });
  };

  const handleTagToggle = (tag: string) => {
    if (!canSelectTags) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleAddCustomTag = () => {
    if (!canSelectTags) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const trimmedTag = customTag.trim();
    if (trimmedTag && !customTags.includes(trimmedTag)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCustomTags([...customTags, trimmedTag]);
      setSelectedTags([...selectedTags, trimmedTag]);
      setCustomTag('');
      setTimeout(() => {
        customTagInputRef.current?.focus();
      }, 100);
    }
  };

  const handlePost = async () => {
    if (!selectedShow) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (rating === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Rating Required', 'Please select a star rating before posting.');
      return;
    }

    setIsPosting(true);
    
    try {
      let dbShow: Awaited<ReturnType<typeof saveShow>> | undefined;
      let dbEpisodes: Episode[] = [];

      if (selectedTraktShow) {
        dbShow = await saveShow(selectedTraktShow);
        const { mapDatabaseShowToShow, mapDatabaseEpisodeToEpisode } = await import('@/services/showMappers');
        const showForPost = mapDatabaseShowToShow(dbShow);

        if (selectedEpisodes.length > 0 && dbShow) {
          const validationErrors: string[] = [];
          
          for (const episode of selectedEpisodes) {
            const episodeKey = getEpisodeKey(episode);
            const traktEpisode = traktEpisodesMap.get(episodeKey);
            
            if (!traktEpisode) {
              validationErrors.push(`Missing data for ${episode.title}`);
              continue;
            }

            if (!traktEpisode.season || !traktEpisode.number || !traktEpisode.title || !traktEpisode.ids?.trakt) {
              validationErrors.push(`Incomplete metadata for ${episode.title} (S${episode.seasonNumber}E${episode.episodeNumber})`);
            }
          }

          if (validationErrors.length > 0) {
            console.error('Episode validation failed:', validationErrors);
            Alert.alert(
              'Episode Data Incomplete',
              `Cannot post due to missing episode information:\n${validationErrors.join('\n')}\n\nThis may happen with specials or unaired episodes. Please try selecting different episodes.`,
              [{ text: 'OK' }]
            );
            setIsPosting(false);
            return;
          }

          const savedEpisodes = await Promise.allSettled(
            selectedEpisodes.map(async (episode) => {
              const episodeKey = getEpisodeKey(episode);
              const traktEpisode = traktEpisodesMap.get(episodeKey)!;

              const dbEpisode = await saveEpisode(
                dbShow!.id,
                dbShow!.tvmaze_id,
                {
                  ids: traktEpisode.ids,
                  season: traktEpisode.season,
                  number: traktEpisode.number,
                  title: traktEpisode.title,
                  overview: traktEpisode.overview || '',
                  rating: traktEpisode.rating || 0,
                }
              );
              return dbEpisode;
            })
          );

          const failedSaves = savedEpisodes.filter(result => result.status === 'rejected' || result.value === null);
          if (failedSaves.length > 0) {
            console.error('Failed to save episodes:', failedSaves);
            Alert.alert(
              'Save Failed',
              `Failed to save ${failedSaves.length} of ${selectedEpisodes.length} episodes. Please try again.`,
              [{ text: 'OK' }]
            );
            setIsPosting(false);
            return;
          }

          dbEpisodes = savedEpisodes
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => mapDatabaseEpisodeToEpisode((result as PromiseFulfilledResult<any>).value));
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newPost = await createPost({
          user: currentUser,
          show: showForPost,
          episodes: dbEpisodes.length > 0 ? dbEpisodes : undefined,
          title: postTitle.trim() || undefined,
          body: postBody.trim(),
          rating: rating > 0 ? rating : undefined,
          tags: selectedTags,
          isSpoiler: selectedTags.some(tag => tag.toLowerCase().includes('spoiler')),
        });

        console.log('Post created successfully');
        
        // Update logged episodes set
        dbEpisodes.forEach(episode => {
          setLoggedEpisodeIds(prev => new Set(prev).add(getEpisodeKey(episode)));
        });
        
        if (onPostSuccess) {
          onPostSuccess(newPost.id, dbEpisodes);
        }
        
        resetModal();
        onClose();
        
        // Navigate to the post page
        router.push(`/post/${newPost.id}`);
      } else {
        console.error('No Trakt show data available');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPosting(false);
    }
  };

  const resetModal = () => {
    setStep('selectShow');
    setSelectedShow(preselectedShow || null);
    setSelectedEpisodes([]);
    setPostTitle('');
    setPostBody('');
    setRating(0);
    setSelectedTags([]);
    setCustomTags([]);
    setCustomTag('');
    setSearchQuery('');
    setSeasons([]);
    setShowSearchResults([]);
    setIsSearching(false);
    setSearchError(null);
    setIsFetchingEpisodes(false);
    setIsPosting(false);
    setSelectedTraktShow(null);
    setTraktEpisodesMap(new Map());
  };

  const renderSelectShow = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select a Show</Text>
        <View style={styles.searchInputContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={tokens.colors.grey1} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search shows..."
            placeholderTextColor={tokens.colors.grey1}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView style={styles.showsList} showsVerticalScrollIndicator={false}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}
          {searchError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{searchError}</Text>
              <Pressable style={styles.retryButton} onPress={() => setSearchQuery(searchQuery + ' ')}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() === '' && isLoadingRecommendations && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              <Text style={styles.loadingText}>Loading recommendations...</Text>
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() === '' && !isLoadingRecommendations && cachedRecommendations.length > 0 && (
            <View style={styles.showsGrid}>
                {cachedRecommendations.slice(0, 12).map(result => (
                  <Pressable
                    key={result.show.id}
                    style={styles.showGridItem}
                    onPress={() => handleRecommendationSelect(result)}
                  >
                    <Image 
                      source={{ uri: getPosterUrl(result.show.poster, result.show.title) }} 
                      style={styles.showGridPoster}
                      contentFit="cover"
                    />
                    <Pressable 
                      style={({ pressed }) => [
                        styles.saveIconGrid,
                        pressed && styles.saveIconPressed,
                      ]} 
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedShowForPlaylist(result.show);
                        setPlaylistModalVisible(true);
                      }}
                    >
                      <IconSymbol 
                        name={isShowSaved(result.show.id) ? "bookmark.fill" : "bookmark"} 
                        size={14} 
                        color={colors.pureWhite} 
                      />
                    </Pressable>
                  </Pressable>
                ))}
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() === '' && !isLoadingRecommendations && cachedRecommendations.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Start typing to search for shows</Text>
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() !== '' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No shows found</Text>
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length > 0 && (
            <View style={styles.showsGrid}>
              {showSearchResults.map(result => (
                <Pressable
                  key={result.show.id}
                  style={styles.showGridItem}
                  onPress={() => handleShowSelect(result.show, result.traktShow)}
                >
                  <Image 
                    source={{ uri: getPosterUrl(result.show.poster, result.show.title) }} 
                    style={styles.showGridPoster}
                    contentFit="cover"
                  />
                  <Pressable 
                    style={({ pressed }) => [
                      styles.saveIconGrid,
                      pressed && styles.saveIconPressed,
                    ]} 
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedShowForPlaylist(result.show);
                      setPlaylistModalVisible(true);
                    }}
                  >
                    <IconSymbol 
                      name={isShowSaved(result.show.id) ? "bookmark.fill" : "bookmark"} 
                      size={14} 
                      color={colors.pureWhite} 
                    />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderSelectEpisodes = () => (
    <View style={styles.stepContainer}>
      {!preselectedShow && (
        <Pressable style={styles.backButton} onPress={() => setStep('selectShow')}>
          <IconSymbol name="chevron.left" size={20} color={colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      )}
      <Text style={styles.stepTitle}>Select Episodes (Optional)</Text>
      <Text style={styles.stepSubtitle}>{selectedShow?.title}</Text>
      <ScrollView style={styles.episodesList} showsVerticalScrollIndicator={false}>
        {seasons.map(season => (
          <View key={season.seasonNumber} style={styles.seasonContainer}>
            <Pressable
              style={styles.seasonHeader}
              onPress={() => toggleSeason(season.seasonNumber)}
            >
              <Text style={styles.seasonTitle}>Season {season.seasonNumber}</Text>
              <View style={styles.seasonHeaderRight}>
                <Text style={styles.seasonEpisodeCount}>
                  {season.episodes.length} Episodes
                </Text>
                {season.expanded ? (
                  <ChevronUp size={20} color={tokens.colors.black} />
                ) : (
                  <ChevronDown size={20} color={tokens.colors.black} />
                )}
              </View>
            </Pressable>
            {season.expanded && (
              <View style={styles.episodesContainer}>
                {season.episodes.map(episode => {
                  const isSelected = selectedEpisodes.some(ep => ep.id === episode.id);
                  const isLogged = loggedEpisodeIds.has(getEpisodeKey(episode));
                  return (
                    <EpisodeListCard
                      key={episode.id}
                      episodeNumber={`S${episode.seasonNumber} E${episode.episodeNumber}`}
                      title={episode.title}
                      description={episode.description}
                      thumbnail={episode.thumbnail}
                      isSelected={isSelected}
                      isLogged={isLogged}
                      onPress={() => handleEpisodeToggle(episode)}
                      onToggleSelect={() => handleEpisodeToggle(episode)}
                      theme="light"
                    />
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <Pressable
        style={styles.continueButton}
        onPress={() => setStep('postDetails')}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </Pressable>
    </View>
  );

  const renderPostDetails = () => (
    <View style={styles.stepContainer}>
      <Pressable style={styles.backButton} onPress={() => setStep('selectEpisodes')}>
        <IconSymbol name="chevron.left" size={20} color={colors.text} />
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
      <Text style={styles.stepTitle}>Post Details</Text>
      <ScrollView style={styles.detailsForm} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.titleInput}
          placeholder="Title (optional)"
          placeholderTextColor={colors.textSecondary}
          value={postTitle}
          onChangeText={setPostTitle}
        />
        <TextInput
          style={styles.bodyInput}
          placeholder="What did you think? (optional)"
          placeholderTextColor={colors.textSecondary}
          value={postBody}
          onChangeText={setPostBody}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        
        <View style={styles.ratingSection}>
          <Text style={styles.sectionLabel}>Rating *</Text>
          <Text style={styles.ratingHint}>Tap or drag for half-stars</Text>
          <HalfStarRating rating={rating} onRatingChange={setRating} />
        </View>

        <View style={styles.tagsSection}>
          <Text style={styles.sectionLabel}>Tags (Optional)</Text>
          {!canSelectTags && (
            <Text style={styles.tagsHint}>Add a title or body text to enable tags</Text>
          )}
          <View style={[styles.tagsContainer, !canSelectTags && styles.tagsContainerDisabled]}>
            {['Fan Theory', 'Discussion', 'Spoiler Alert', 'Episode Recap', 'Misc'].map(tag => (
              <Pressable
                key={tag}
                style={[
                  styles.tagButton,
                  selectedTags.includes(tag) && styles.tagButtonSelected,
                  !canSelectTags && styles.tagButtonDisabled,
                ]}
                onPress={() => handleTagToggle(tag)}
                disabled={!canSelectTags}
              >
                <Text
                  style={[
                    styles.tagButtonText,
                    selectedTags.includes(tag) && styles.tagButtonTextSelected,
                    !canSelectTags && styles.tagButtonTextDisabled,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
            {customTags.map(tag => (
              <Pressable
                key={tag}
                style={[
                  styles.tagButton,
                  selectedTags.includes(tag) && styles.tagButtonSelected,
                  !canSelectTags && styles.tagButtonDisabled,
                ]}
                onPress={() => handleTagToggle(tag)}
                disabled={!canSelectTags}
              >
                <Text
                  style={[
                    styles.tagButtonText,
                    selectedTags.includes(tag) && styles.tagButtonTextSelected,
                    !canSelectTags && styles.tagButtonTextDisabled,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
          
          <View style={styles.customTagContainer}>
            <TextInput
              ref={customTagInputRef}
              style={[styles.customTagInput, !canSelectTags && styles.customTagInputDisabled]}
              placeholder="Add custom tag"
              placeholderTextColor={colors.textSecondary}
              value={customTag}
              onChangeText={setCustomTag}
              onSubmitEditing={handleAddCustomTag}
              returnKeyType="done"
              blurOnSubmit={false}
              editable={canSelectTags}
            />
            <Pressable
              style={[styles.addTagButton, (!customTag.trim() || !canSelectTags) && styles.addTagButtonDisabled]}
              onPress={handleAddCustomTag}
              disabled={!customTag.trim() || !canSelectTags}
            >
              <IconSymbol name="plus" size={20} color={(customTag.trim() && canSelectTags) ? '#000000' : colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <Pressable
        style={[styles.postButton, (rating === 0 || isPosting) && styles.postButtonDisabled]}
        onPress={handlePost}
        disabled={rating === 0 || isPosting}
      >
        {isPosting ? (
          <ActivityIndicator color={tokens.colors.black} />
        ) : (
          <Text style={styles.postButtonText}>Post</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <Pressable style={styles.overlayTouchable} onPress={onClose} />
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {step === 'selectShow' && renderSelectShow()}
          {step === 'selectEpisodes' && renderSelectEpisodes()}
          {step === 'postDetails' && renderPostDetails()}
        </Animated.View>
      </Animated.View>
      
      {selectedShowForPlaylist && (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShowForPlaylist(null);
          }}
          show={selectedShowForPlaylist}
          onAddToPlaylist={() => {}}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    height: 780,
    backgroundColor: tokens.colors.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 24,
    paddingLeft: 24,
    paddingBottom: 24,
    paddingRight: 24,
    alignSelf: 'center',
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
    marginBottom: 16,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.gapLarge,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapLarge,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  searchInputContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 392,
    height: 46,
    alignItems: 'center',
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.p1,
    fontSize: 16,
    color: tokens.colors.black,
  },
  showsList: {
    flex: 1,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 7,
    rowGap: 7,
  },
  showGridItem: {
    position: 'relative',
    width: '31.5%',
    aspectRatio: 109 / 164,
  },
  showGridPoster: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  saveIconGrid: {
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
  showGridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  episodesList: {
    flex: 1,
  },
  seasonContainer: {
    marginBottom: spacing.gapLarge,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: tokens.colors.pureWhite,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    borderRadius: 12,
    marginBottom: spacing.gapSmall,
  },
  seasonTitle: {
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontWeight: '500',
    color: tokens.colors.black,
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
    color: tokens.colors.grey3,
  },
  episodesContainer: {
    gap: spacing.gapSmall,
  },
  continueButton: {
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: components.borderRadiusButton,
    padding: spacing.gapLarge,
    alignItems: 'center',
    marginTop: spacing.gapLarge,
  },
  continueButtonText: {
    ...tokens.typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.black,
  },
  detailsForm: {
    flex: 1,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusButton,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapLarge,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.gapMedium,
  },
  bodyInput: {
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusButton,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapLarge,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.gapLarge,
    minHeight: 120,
  },
  ratingSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.gapMedium,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.gapSmall,
  },
  starContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  starVisual: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starWrapper: {
    position: 'relative',
    width: 32,
    height: 32,
  },
  halfStarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 32,
    overflow: 'hidden',
  },
  touchZoneLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 40,
    backgroundColor: 'transparent',
  },
  touchZoneRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 40,
    backgroundColor: 'transparent',
  },
  ratingHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapMedium,
  },
  tagButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: spacing.gapLarge,
    paddingVertical: spacing.gapSmall,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
  },
  tagButtonSelected: {
    backgroundColor: tokens.colors.greenHighlight,
    borderColor: tokens.colors.greenHighlight,
  },
  tagButtonText: {
    ...tokens.typography.p1B,
    fontSize: 14,
    color: colors.text,
  },
  tagButtonTextSelected: {
    color: tokens.colors.black,
  },
  tagsHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tagsContainerDisabled: {
    opacity: 0.5,
  },
  tagButtonDisabled: {
    opacity: 0.5,
  },
  tagButtonTextDisabled: {
    color: colors.textSecondary,
  },
  customTagInputDisabled: {
    opacity: 0.5,
  },
  customTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapMedium,
  },
  customTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
  },
  customTagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customTagContainer: {
    flexDirection: 'row',
    gap: spacing.gapMedium,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusButton,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapMedium,
    fontSize: 14,
    color: colors.text,
  },
  addTagButton: {
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: components.borderRadiusButton,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButtonDisabled: {
    opacity: 0.5,
  },
  postButton: {
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: components.borderRadiusButton,
    padding: spacing.gapLarge,
    alignItems: 'center',
    marginTop: spacing.gapLarge,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    ...tokens.typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.black,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: tokens.colors.greenHighlight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.black,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  showGridPosterPlaceholder: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showGridPosterText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
});
