
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
  KeyboardAvoidingView,
  Platform,
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
import { ensureShowId } from '@/services/showRegistry';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import EpisodeListCard, { EpisodeSelectionState } from '@/components/EpisodeListCard';
import { ChevronUp, ChevronDown, Star } from 'lucide-react-native';
import { getEpisode as getTVMazeEpisode } from '@/services/tvmaze';
import { supabase } from '@/integrations/supabase/client';
import PostTags from '@/components/PostTags';
import MentionInput from '@/components/MentionInput';
import { savePostMentions, getUserIdsByUsernames, createMentionNotifications, extractMentions } from '@/utils/mentionUtils';

interface PostModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedShow?: Show;
  preselectedEpisode?: Episode;
  preselectedEpisodes?: Episode[];
  episodeSelections?: Map<string, EpisodeSelectionState>;
  prefilledRating?: number;
  skipToPostDetails?: boolean;
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
          {isEmpty ? (
            <Star size={32} color={emptyColor} fill="none" strokeWidth={1} />
          ) : null}
          {isHalf ? (
            <View style={styles.starWrapper}>
              <Star size={32} color={emptyColor} fill="none" strokeWidth={1} />
              <View style={styles.halfStarOverlay}>
                <Star size={32} color={highlightColor} fill={highlightColor} strokeWidth={1} />
              </View>
            </View>
          ) : null}
          {isFull ? (
            <Star size={32} color={highlightColor} fill={highlightColor} strokeWidth={1} />
          ) : null}
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

export default function PostModal({ visible, onClose, preselectedShow, preselectedEpisode, preselectedEpisodes, episodeSelections, prefilledRating, skipToPostDetails, onPostSuccess }: PostModalProps) {
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
  const [localEpisodeSelections, setLocalEpisodeSelections] = useState<Map<string, EpisodeSelectionState>>(new Map());
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postMentions, setPostMentions] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isEditingCustomTag, setIsEditingCustomTag] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShowForPlaylist, setSelectedShowForPlaylist] = useState<Show | null>(null);
  const [loggedEpisodeIds, setLoggedEpisodeIds] = useState<Set<string>>(new Set());
  const [rewatchedEpisodeIds, setRewatchedEpisodeIds] = useState<Set<string>>(new Set());
  
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
      setRewatchedEpisodeIds(new Set());
      return;
    }

    // Filter posts by current user and selected show
    const userShowPosts = posts.filter(
      post => post.user.id === currentUser.id && post.show.id === selectedShow.id
    );

    // Extract episode keys from all posts (use deterministic format, not UUIDs)
    const loggedIds = new Set<string>();
    const rewatchedIds = new Set<string>();
    
    userShowPosts.forEach(post => {
      // Handle single episode (legacy posts)
      if (post.episode) {
        loggedIds.add(getEpisodeKey(post.episode));
      }
      // Handle multiple episodes (new posts)
      if (post.episodes && post.episodes.length > 0) {
        post.episodes.forEach(ep => {
          const key = getEpisodeKey(ep);
          loggedIds.add(key);
          // Check if this episode is in rewatchEpisodeIds
          if (post.rewatchEpisodeIds?.includes(ep.id)) {
            rewatchedIds.add(key);
          }
        });
      }
    });

    setLoggedEpisodeIds(loggedIds);
    setRewatchedEpisodeIds(rewatchedIds);
  }, [posts, currentUser, selectedShow]);

  useEffect(() => {
    if (!visible) return;
    
    // Initialize state from props when modal opens
    setSelectedShow(preselectedShow || null);
    setSelectedEpisodes(preselectedEpisodes || (preselectedEpisode ? [preselectedEpisode] : []));
    
    // Set prefilled rating if provided (for show ratings flow)
    if (prefilledRating !== undefined && prefilledRating > 0) {
      setRating(prefilledRating);
    }
    
    // Smart step selection based on what's preselected
    if (skipToPostDetails && preselectedShow) {
      // Flow 3: Coming from show rating modal → skip straight to post details with rating
      console.log('✅ Show rating flow - skipping to post details with rating:', prefilledRating);
      setIsFetchingEpisodes(false);
      setStep('postDetails');
      // Load Trakt/database show data in background for post creation
      loadTraktDataForPreselectedShow(preselectedShow, true).catch(err => {
        console.warn('⚠️ Show data fetch failed (non-blocking):', err);
      });
    } else if (preselectedShow && (preselectedEpisodes || preselectedEpisode)) {
      // Flow 2: Show and episodes already selected from ShowHub → skip straight to rating page
      console.log('✅ Episodes preselected from ShowHub - skipping to rating page');
      setIsFetchingEpisodes(false);
      setStep('postDetails');
      // Load Trakt data in background (non-blocking) for post creation, but don't wait for it
      loadTraktDataForPreselectedShow(preselectedShow, true).catch(err => {
        console.warn('⚠️ Trakt data fetch failed (non-blocking):', err);
        // Failure is OK - we'll use episode data from ShowHub if needed
      });
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
  }, [visible, preselectedShow, preselectedEpisode, preselectedEpisodes, skipToPostDetails, prefilledRating]);

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
        // Fallback: Load episodes from database instead
        const dbEpisodes = await getEpisodesByShowId(show.id);
        if (dbEpisodes && dbEpisodes.length > 0) {
          console.log(`✅ Loaded ${dbEpisodes.length} episodes from database as fallback`);
          const { mapDatabaseEpisodeToEpisode } = await import('@/services/showMappers');
          
          // Group episodes by season
          const seasonMap = new Map<number, Episode[]>();
          for (const dbEp of dbEpisodes) {
            const episode = mapDatabaseEpisodeToEpisode(dbEp);
            if (!seasonMap.has(episode.seasonNumber)) {
              seasonMap.set(episode.seasonNumber, []);
            }
            seasonMap.get(episode.seasonNumber)!.push(episode);
          }
          
          const seasonsArray: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
            seasonNumber,
            episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
            expanded: seasonNumber === 1, // Expand first season by default
          }));
          
          setSeasons(seasonsArray);
        }
        setIsFetchingEpisodes(false);
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
      // Only fall back to show selection if this is blocking mode
      if (!skipToReview) {
        setStep('selectShow');
      }
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
        console.log(`🔍 Searching for: "${searchQuery}"`);
        
        // Try Trakt API first
        let traktShows: any[] = [];
        try {
          const searchResponse = await searchShows(searchQuery);
          traktShows = searchResponse.results.map(r => r.show);
          console.log(`✅ Found ${traktShows.length} shows from Trakt`);
        } catch (traktError) {
          // FALLBACK: Search database if Trakt fails
          console.warn('⚠️ Trakt search failed, falling back to database search', traktError);
          const { data: dbShows, error: dbError } = await supabase
            .from('shows')
            .select('*')
            .ilike('title', `%${searchQuery}%`)
            .limit(20);
          
          if (dbError) {
            throw new Error('Both Trakt and database search failed');
          }
          
          if (dbShows && dbShows.length > 0) {
            console.log(`📦 Found ${dbShows.length} shows from database fallback`);
            const { mapDatabaseShowToShow } = await import('@/services/showMappers');
            const mappedShows = dbShows.map(dbShow => ({
              show: mapDatabaseShowToShow(dbShow),
              traktShow: null // No Trakt data available
            }));
            setShowSearchResults(mappedShows);
            setIsSearching(false);
            return;
          } else {
            // No results from database either
            setShowSearchResults([]);
            setIsSearching(false);
            setSearchError('No shows found. Trakt API is currently unavailable.');
            return;
          }
        }
        
        // Handle empty Trakt results
        if (traktShows.length === 0) {
          setShowSearchResults([]);
          setIsSearching(false);
          return;
        }
        
        console.log('🎯 Starting instant poster enrichment (DB-first + batched API)...');
        
        const { mapTraktShowToShow } = await import('@/services/showMappers');
        const { showEnrichmentManager } = await import('@/services/showEnrichment');
        
        // Step 1: Check database for cached posters (instant)
        const traktIds = traktShows.map(s => s.ids.trakt);
        const { data: dbShows } = await supabase
          .from('shows')
          .select('trakt_id, poster_url, backdrop_url, tvmaze_id, imdb_id, total_seasons')
          .in('trakt_id', traktIds);
        
        const dbShowsMap = new Map(
          (dbShows || []).map(show => [show.trakt_id, show])
        );
        console.log(`📦 Found ${dbShowsMap.size}/${traktShows.length} shows in database cache`);
        
        // Step 2: Prioritize visible shows (first 12) for enrichment
        const visibleCount = 12;
        const visibleShows = traktShows.slice(0, visibleCount);
        const remainingShows = traktShows.slice(visibleCount);
        
        // Step 3: Batch enrich visible shows with Promise.allSettled (parallel, reliable)
        const visibleEnrichmentPromises = visibleShows.map(async (traktShow) => {
          const dbShow = dbShowsMap.get(traktShow.ids.trakt);
          if (dbShow?.poster_url) {
            // Already cached in DB - instant
            return {
              traktShow,
              posterUrl: dbShow.poster_url,
              totalSeasons: dbShow.total_seasons || 0,
            };
          }
          
          // Not in DB - enrich via ShowEnrichmentManager, then persist
          const enriched = await showEnrichmentManager.enrichShow(traktShow);
          
          // Persist enriched data to Supabase for future caching
          try {
            await saveShow(traktShow, {
              enrichedPosterUrl: enriched.posterUrl || undefined,
              enrichedBackdropUrl: enriched.backdropUrl || undefined,
              enrichedTVMazeId: enriched.tvmazeId || undefined,
              enrichedImdbId: enriched.imdbId || undefined,
              enrichedSeasonCount: enriched.totalSeasons || undefined,
            });
            console.log(`💾 Cached ${traktShow.title} to database`);
          } catch (saveError) {
            console.warn(`⚠️ Failed to cache ${traktShow.title}:`, saveError);
          }
          
          return {
            traktShow,
            posterUrl: enriched.posterUrl,
            totalSeasons: enriched.totalSeasons || 0,
          };
        });
        
        const visibleResults = await Promise.allSettled(visibleEnrichmentPromises);
        
        // Step 4: Map enriched visible shows
        const mappedVisibleShows = visibleResults.map((result, index) => {
          const traktShow = visibleShows[index];
          if (result.status === 'fulfilled') {
            return {
              show: mapTraktShowToShow(traktShow, {
                posterUrl: result.value.posterUrl,
                totalSeasons: result.value.totalSeasons,
              }),
              traktShow
            };
          } else {
            // Fallback on error
            console.warn(`⚠️ Enrichment failed for ${traktShow.title}:`, result.reason);
            return {
              show: mapTraktShowToShow(traktShow, undefined),
              traktShow
            };
          }
        });
        
        // Display visible shows immediately (with posters!)
        setShowSearchResults(mappedVisibleShows);
        setIsSearching(false);
        console.log(`✅ Displayed ${mappedVisibleShows.length} shows with instant posters`);
        
        // Step 5: Background enrich remaining shows (AFTER visible batch completes)
        if (remainingShows.length > 0) {
          // Use setImmediate/setTimeout to ensure visible batch is fully rendered first
          setTimeout(async () => {
            try {
              console.log(`⏳ Background enriching ${remainingShows.length} remaining shows...`);
              const remainingPromises = remainingShows.map(async (traktShow) => {
                const dbShow = dbShowsMap.get(traktShow.ids.trakt);
                if (dbShow?.poster_url) {
                  return {
                    traktShow,
                    posterUrl: dbShow.poster_url,
                    totalSeasons: dbShow.total_seasons || 0,
                  };
                }
                const enriched = await showEnrichmentManager.enrichShow(traktShow);
                
                // Persist to DB
                try {
                  await saveShow(traktShow, {
                    enrichedPosterUrl: enriched.posterUrl || undefined,
                    enrichedBackdropUrl: enriched.backdropUrl || undefined,
                    enrichedTVMazeId: enriched.tvmazeId || undefined,
                    enrichedImdbId: enriched.imdbId || undefined,
                    enrichedSeasonCount: enriched.totalSeasons || undefined,
                  });
                } catch (saveError) {
                  console.warn(`⚠️ Failed to cache ${traktShow.title}:`, saveError);
                }
                
                return {
                  traktShow,
                  posterUrl: enriched.posterUrl,
                  totalSeasons: enriched.totalSeasons || 0,
                };
              });
              
              const remainingResults = await Promise.allSettled(remainingPromises);
              const mappedRemainingShows = remainingResults.map((result, index) => {
                const traktShow = remainingShows[index];
                if (result.status === 'fulfilled') {
                  return {
                    show: mapTraktShowToShow(traktShow, {
                      posterUrl: result.value.posterUrl,
                      totalSeasons: result.value.totalSeasons,
                    }),
                    traktShow
                  };
                } else {
                  return {
                    show: mapTraktShowToShow(traktShow, undefined),
                    traktShow
                  };
                }
              });
              
              // Append remaining shows
              setShowSearchResults(prev => [...prev, ...mappedRemainingShows]);
              console.log(`✅ Background enrichment complete: +${mappedRemainingShows.length} shows`);
            } catch (bgError) {
              console.error('❌ Background enrichment failed:', bgError);
            }
          }, 100); // Delay to prevent queue contention with visible batch
        }
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
    setIsFetchingEpisodes(true);
    
    try {
      // BULLETPROOF: Ensure show is saved to database and get valid UUID
      const guaranteedShowId = await ensureShowId({
        traktId: traktShow.ids.trakt,
        traktShow,
      });
      console.log('✅ PostModal: Guaranteed show ID:', guaranteedShowId);
      
      // Update show with the guaranteed database ID
      const showWithValidId = { ...show, id: guaranteedShowId };
      setSelectedShow(showWithValidId);
      setSelectedTraktShow(traktShow);
      
      const traktId = traktShow.ids.trakt;
      const showMappersModule = await import('@/services/showMappers');
      const traktModule = await import('@/services/trakt');
      const mapTraktEpisodeToEpisode = showMappersModule.mapTraktEpisodeToEpisode;
      const getShowSeasons = traktModule.getShowSeasons;
      const getSeasonEpisodes = traktModule.getSeasonEpisodes;
      
      const { data: dbEpisodes } = await supabase
        .from('episodes')
        .select('*')
        .eq('show_id', guaranteedShowId);
      
      if (dbEpisodes && dbEpisodes.length > 0) {
        console.log(`⚡ Found ${dbEpisodes.length} cached episodes, fetching ALL from Trakt for complete list...`);
        
        const watchedKeys = await getWatchedEpisodeKeys(guaranteedShowId);
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
          const mappedEpisode = mapTraktEpisodeToEpisode(episode, guaranteedShowId, null);
          const episodeKey = `${guaranteedShowId}-${episode.season}-${episode.number}`;
          
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
        console.log(`📡 Background loading ${remainingSeasons.length} additional seasons for ${showWithValidId.title}...`);
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
                const mappedEpisode = mapTraktEpisodeToEpisode(episode, guaranteedShowId, null);
                const episodeKey = `${guaranteedShowId}-${episode.season}-${episode.number}`;
                
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
      const watchedKeys = await getWatchedEpisodeKeys(guaranteedShowId);
      
      const seasonMap = new Map<number, Episode[]>();
      const traktEpsMap = new Map<string, TraktEpisode>();
      
      const firstSeason = seasonsData.find(s => s.number > 0);
      if (firstSeason) {
        const episodesData = await getSeasonEpisodes(traktId, firstSeason.number);
        
        for (const episode of episodesData) {
          const mappedEpisode = mapTraktEpisodeToEpisode(episode, guaranteedShowId, null);
          const episodeKey = `${guaranteedShowId}-${episode.season}-${episode.number}`;
          
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
      console.log(`📡 Background loading ${remainingSeasons.length} additional seasons for ${showWithValidId.title}...`);
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
              const mappedEpisode = mapTraktEpisodeToEpisode(episode, guaranteedShowId, null);
              const episodeKey = `${guaranteedShowId}-${episode.season}-${episode.number}`;
              
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
    
    const episodeKey = getEpisodeKey(episode);
    const isLogged = loggedEpisodeIds.has(episodeKey);
    
    // Get current state before updating
    const mapState = localEpisodeSelections.get(episode.id);
    const currentState = mapState || (isLogged ? 'watched' : 'none');
    
    // Determine the next state
    let nextState: EpisodeSelectionState;
    if (currentState === 'none') {
      nextState = 'watched';
    } else if (currentState === 'watched') {
      nextState = 'rewatched';
    } else if (currentState === 'rewatched') {
      nextState = isLogged ? 'unselected' : 'none';
    } else {
      // unselected -> watched
      nextState = 'watched';
    }
    
    // Update selection map
    setLocalEpisodeSelections(prev => {
      const newMap = new Map(prev);
      if (nextState === 'none') {
        newMap.delete(episode.id);
      } else {
        newMap.set(episode.id, nextState);
      }
      return newMap;
    });
    
    // Update selectedEpisodes - include episode if it's watched or rewatched
    setSelectedEpisodes(prev => {
      if (nextState === 'watched' || nextState === 'rewatched') {
        // Add or keep in list
        const filtered = prev.filter(ep => ep.id !== episode.id);
        return [...filtered, episode];
      } else {
        // Remove from list (none or unselected)
        return prev.filter(ep => ep.id !== episode.id);
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
    console.log("🚀 POST CREATION STARTED - Show:", selectedShow?.title, "Rating:", rating, "Episodes:", selectedEpisodes.length, "TraktMap size:", traktEpisodesMap.size);
    console.log("📦 episodeSelections from ShowHub:", episodeSelections ? Array.from(episodeSelections.entries()) : 'none');
    console.log("📦 localEpisodeSelections:", Array.from(localEpisodeSelections.entries()));
    console.log("📦 selectedEpisodes:", selectedEpisodes.map(e => ({ id: e.id, s: e.seasonNumber, e: e.episodeNumber, title: e.title })));
    if (!selectedShow) {
      console.log("❌ BLOCKED: No selected show");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (rating === 0) {
      console.log("❌ BLOCKED: Rating is 0");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Rating Required', 'Please select a star rating before posting.');
      return;
    }
    
    console.log("✅ Initial validation passed - proceeding with show save");

    setIsPosting(true);
    
    try {
      let dbShow: Awaited<ReturnType<typeof saveShow>> | undefined;
      let dbEpisodes: Episode[] = [];

      if (selectedTraktShow) {
        // Full Trakt data available - use it
        dbShow = await saveShow(selectedTraktShow);
        const { mapDatabaseShowToShow, mapDatabaseEpisodeToEpisode } = await import('@/services/showMappers');
        const showForPost = mapDatabaseShowToShow(dbShow);

        if (selectedEpisodes.length > 0 && dbShow) {
          const validationErrors: string[] = [];
          
          // Validate episodes - check if we have data from EITHER Trakt OR ShowHub
          for (const episode of selectedEpisodes) {
            const episodeKey = getEpisodeKey(episode);
            const traktEpisode = traktEpisodesMap.get(episodeKey);
            
            // If Trakt data available, validate it
            if (traktEpisode) {
              if (!traktEpisode.season || !traktEpisode.number || !traktEpisode.title || !traktEpisode.ids?.trakt) {
                validationErrors.push(`Incomplete metadata for ${episode.title} (S${episode.seasonNumber}E${episode.episodeNumber})`);
              }
            } else {
              // No Trakt data - check if ShowHub episode has required fields
              if (!episode.seasonNumber || !episode.episodeNumber || !episode.title) {
                validationErrors.push(`Missing data for ${episode.title}`);
              }
            }
          }

          if (validationErrors.length > 0) {
            console.error('❌ Episode validation failed:', validationErrors);
            Alert.alert(
              'Episode Data Incomplete',
              `Cannot post due to missing episode information:\n${validationErrors.join('\n')}\n\nThis may happen with specials or unaired episodes. Please try selecting different episodes.`,
              [{ text: 'OK' }]
            );
            setIsPosting(false);
            return;
          }
          
          console.log("✅ Episode validation passed - using", traktEpisodesMap.size > 0 ? "Trakt data" : "ShowHub data");

          const savedEpisodes = await Promise.allSettled(
            selectedEpisodes.map(async (episode) => {
              const episodeKey = getEpisodeKey(episode);
              const traktEpisode = traktEpisodesMap.get(episodeKey);
              
              // Use Trakt data if available, otherwise use ShowHub episode data
              if (traktEpisode) {
                // Full Trakt data available - use it for complete metadata
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
              } else {
                // Trakt unavailable - use ShowHub episode data
                console.log('⚠️ Using ShowHub data for episode:', episode.title);
                
                // First, check if episode is already in database
                const { getEpisodesByShowId } = await import('@/services/showDatabase');
                const dbEpisodes = await getEpisodesByShowId(dbShow!.id);
                const matchingEpisode = dbEpisodes.find(
                  ep => ep.season_number === episode.seasonNumber && ep.episode_number === episode.episodeNumber
                );
                
                if (matchingEpisode) {
                  console.log('✅ Episode already in database, reusing');
                  return matchingEpisode;
                }
                
                // Episode not in database - save it using ShowHub data
                console.log('💾 Saving new episode from ShowHub data');
                
                // Generate collision-free episode ID using larger bases
                // Formula: showTraktId * 100000000 + season * 10000 + episode
                // This supports seasons up to 9999 and episodes up to 9999
                // Example: Show 12345, S1E101 → 1234500010101 | S2E1 → 1234500020001 (no collision!)
                const uniqueEpisodeId = dbShow!.trakt_id 
                  ? dbShow!.trakt_id * 100000000 + episode.seasonNumber * 10000 + episode.episodeNumber
                  : Math.floor(Math.random() * 1000000000); // Fallback to random for safety
                
                const dbEpisode = await saveEpisode(
                  dbShow!.id,
                  dbShow!.tvmaze_id,
                  {
                    ids: {
                      trakt: uniqueEpisodeId,
                      tvdb: null,
                      imdb: null,
                      tmdb: null,
                    },
                    season: episode.seasonNumber,
                    number: episode.episodeNumber,
                    title: episode.title,
                    overview: episode.description || '',
                    rating: episode.rating || 0,
                  }
                );
                return dbEpisode;
              }
            })
          );

          const failedSaves = savedEpisodes.filter(result => result.status === 'rejected' || result.value === null);
          if (failedSaves.length > 0) {
            console.error('⚠️ Some episodes failed to save, but continuing with post creation');
            console.error('Failed episodes:', failedSaves);
            // Don't block post creation - just skip failed episodes
          }

          dbEpisodes = savedEpisodes
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => mapDatabaseEpisodeToEpisode((result as PromiseFulfilledResult<any>).value));
        }

        // CRITICAL: Create post FIRST, even if episode saving failed
        console.log('📝 Creating post in Supabase...');
        console.log('🔍 dbEpisodes:', dbEpisodes.map(e => ({ id: e.id, s: e.seasonNumber, e: e.episodeNumber })));
        console.log('🔍 selectedEpisodes:', selectedEpisodes.map(e => ({ id: e.id, s: e.seasonNumber, e: e.episodeNumber })));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const rewatchEpisodeIds = dbEpisodes
          .filter(ep => {
            // Check localEpisodeSelections first (PostModal's Select Episodes flow)
            for (const [selId, state] of localEpisodeSelections.entries()) {
              if (state === 'rewatched') {
                // Find the original episode from selectedEpisodes to get season/episode number
                const originalEp = selectedEpisodes.find(e => e.id === selId);
                if (originalEp && originalEp.seasonNumber === ep.seasonNumber && originalEp.episodeNumber === ep.episodeNumber) {
                  console.log('🔮 Found rewatched episode (local flow):', { selId, season: originalEp.seasonNumber, episode: originalEp.episodeNumber, dbEpId: ep.id });
                  return true;
                }
              }
            }
            // Then check episodeSelections prop (ShowHub flow)
            // ShowHub uses episode IDs as keys (e.g., "uuid-format-id")
            if (episodeSelections && episodeSelections.size > 0) {
              for (const [selId, state] of episodeSelections.entries()) {
                if (state === 'rewatched') {
                  // Find the original episode from selectedEpisodes using the episode ID
                  const originalEp = selectedEpisodes.find(e => e.id === selId);
                  console.log('🔍 ShowHub check:', { selId, state, ep: { s: ep.seasonNumber, e: ep.episodeNumber }, originalEp: originalEp ? { id: originalEp.id, s: originalEp.seasonNumber, e: originalEp.episodeNumber } : null });
                  if (originalEp && originalEp.seasonNumber === ep.seasonNumber && originalEp.episodeNumber === ep.episodeNumber) {
                    console.log('🔮 Found rewatched episode (ShowHub flow):', { selId, season: originalEp.seasonNumber, episode: originalEp.episodeNumber, dbEpId: ep.id });
                    return true;
                  }
                }
              }
            }
            return false;
          })
          .map(ep => ep.id);
        
        console.log('🎬 Computed rewatchEpisodeIds:', rewatchEpisodeIds);

        const newPost = await createPost({
          user: currentUser,
          show: showForPost,
          episodes: dbEpisodes.length > 0 ? dbEpisodes : undefined,
          rewatchEpisodeIds: rewatchEpisodeIds.length > 0 ? rewatchEpisodeIds : undefined,
          title: postTitle.trim() || undefined,
          body: postBody.trim(),
          rating: rating > 0 ? rating : undefined,
          tags: selectedTags,
          isSpoiler: selectedTags.some(tag => tag.toLowerCase().includes('spoiler')),
        });

        console.log('Post created successfully');
        
        // Save mentions and create notifications - extract from text at submission time
        const mentionedUsernames = extractMentions(postBody);
        if (mentionedUsernames.length > 0) {
          try {
            await savePostMentions(newPost.id, mentionedUsernames);
            const userMap = await getUserIdsByUsernames(mentionedUsernames);
            const mentionedUserIds = Array.from(userMap.values());
            await createMentionNotifications(
              mentionedUserIds,
              currentUser.id,
              'mention_post',
              newPost.id
            );
            console.log(`✅ Saved ${mentionedUsernames.length} mentions for post`);
          } catch (mentionError) {
            console.error('Error saving mentions:', mentionError);
          }
        }
        
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
      } else if (selectedShow && !selectedTraktShow) {
        // Trakt API failed, but we have ShowHub data - use fallback
        console.log('⚠️ No Trakt show data - using ShowHub fallback for:', selectedShow.title);
        
        const { mapDatabaseShowToShow, mapDatabaseEpisodeToEpisode } = await import('@/services/showMappers');
        
        // Extract Trakt ID from selectedShow.id (format: "trakt-{traktId}" or "{uuid}")
        let traktId: number | null = null;
        if (selectedShow.id.startsWith('trakt-')) {
          traktId = parseInt(selectedShow.id.split('-')[1], 10);
        }
        
        if (traktId) {
          // Try to get show from database by Trakt ID
          const show = await getShowByTraktId(traktId);
          dbShow = show || undefined;
        } else {
          // Try to get show from database by UUID
          const show = await getShowById(selectedShow.id);
          dbShow = show || undefined;
        }
        
        if (!dbShow) {
          console.error('❌ Show not found in database:', selectedShow.id);
          Alert.alert(
            'Show Data Missing',
            'Unable to find show information in database. Please try selecting the show again.',
            [{ text: 'OK' }]
          );
          setIsPosting(false);
          return;
        }
        
        const showForPost = mapDatabaseShowToShow(dbShow);
        
        // Handle episodes using ShowHub data (reuse existing fallback logic)
        if (selectedEpisodes.length > 0 && dbShow) {
          const validationErrors: string[] = [];
          
          // Validate ShowHub episodes
          for (const episode of selectedEpisodes) {
            if (!episode.seasonNumber || !episode.episodeNumber || !episode.title) {
              validationErrors.push(`Missing data for ${episode.title}`);
            }
          }

          if (validationErrors.length > 0) {
            console.error('❌ Episode validation failed:', validationErrors);
            Alert.alert(
              'Episode Data Incomplete',
              `Cannot post due to missing episode information:\n${validationErrors.join('\n')}`,
              [{ text: 'OK' }]
            );
            setIsPosting(false);
            return;
          }
          
          console.log("✅ Episode validation passed - using ShowHub data");

          // Fetch all existing episodes ONCE (not per-iteration)
          const { getEpisodesByShowId } = await import('@/services/showDatabase');
          const existingDbEpisodes = await getEpisodesByShowId(dbShow.id);
          
          // Create local reference for TypeScript
          const currentDbShow = dbShow;
          
          const savedEpisodes = await Promise.allSettled(
            selectedEpisodes.map(async (episode) => {
              // Check if episode already exists in database
              const matchingEpisode = existingDbEpisodes.find(
                ep => ep.season_number === episode.seasonNumber && ep.episode_number === episode.episodeNumber
              );
              
              if (matchingEpisode) {
                console.log('✅ Episode already in database, reusing');
                return matchingEpisode;
              }
              
              // Episode not in database - save it using ShowHub data
              console.log('💾 Saving new episode from ShowHub data');
              
              const dbEpisode = await saveEpisode(
                currentDbShow.id,
                currentDbShow.tvmaze_id,
                {
                  ids: {
                    trakt: null,
                    tvdb: null,
                    imdb: null,
                    tmdb: null,
                  },
                  season: episode.seasonNumber,
                  number: episode.episodeNumber,
                  title: episode.title,
                  overview: episode.description || '',
                  rating: episode.rating || 0,
                }
              );
              return dbEpisode;
            })
          );

          const failedSaves = savedEpisodes.filter(result => result.status === 'rejected' || result.value === null);
          if (failedSaves.length > 0) {
            console.error('❌ Episode saves failed:', failedSaves);
            Alert.alert(
              'Episode Save Failed',
              'Some episodes could not be saved to the database. Please try again.',
              [{ text: 'OK' }]
            );
            setIsPosting(false);
            return;
          }

          dbEpisodes = savedEpisodes
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => mapDatabaseEpisodeToEpisode((result as PromiseFulfilledResult<any>).value));
        }

        // Create post
        console.log('📝 Creating post in Supabase...');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const rewatchEpisodeIdsFallback = dbEpisodes
          .filter(ep => {
            // Check localEpisodeSelections first (PostModal's Select Episodes flow)
            for (const [selId, state] of localEpisodeSelections.entries()) {
              if (state === 'rewatched') {
                const originalEp = selectedEpisodes.find(e => e.id === selId);
                if (originalEp && originalEp.seasonNumber === ep.seasonNumber && originalEp.episodeNumber === ep.episodeNumber) {
                  return true;
                }
              }
            }
            // Then check episodeSelections prop (ShowHub flow)
            for (const [selId, state] of episodeSelections?.entries() || []) {
              if (state === 'rewatched') {
                const originalEp = preselectedEpisodes?.find(e => e.id === selId);
                if (originalEp && originalEp.seasonNumber === ep.seasonNumber && originalEp.episodeNumber === ep.episodeNumber) {
                  return true;
                }
              }
            }
            return false;
          })
          .map(ep => ep.id);

        const newPost = await createPost({
          user: currentUser,
          show: showForPost,
          episodes: dbEpisodes.length > 0 ? dbEpisodes : undefined,
          rewatchEpisodeIds: rewatchEpisodeIdsFallback.length > 0 ? rewatchEpisodeIdsFallback : undefined,
          title: postTitle.trim() || undefined,
          body: postBody.trim(),
          rating: rating > 0 ? rating : undefined,
          tags: selectedTags,
          isSpoiler: selectedTags.some(tag => tag.toLowerCase().includes('spoiler')),
        });

        console.log('Post created successfully with ShowHub fallback');
        
        // Save mentions and create notifications - extract from text at submission time
        const mentionedUsernames = extractMentions(postBody);
        if (mentionedUsernames.length > 0) {
          try {
            await savePostMentions(newPost.id, mentionedUsernames);
            const userMap = await getUserIdsByUsernames(mentionedUsernames);
            const mentionedUserIds = Array.from(userMap.values());
            await createMentionNotifications(
              mentionedUserIds,
              currentUser.id,
              'mention_post',
              newPost.id
            );
            console.log(`✅ Saved ${mentionedUsernames.length} mentions for post`);
          } catch (mentionError) {
            console.error('Error saving mentions:', mentionError);
          }
        }
        
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
        console.error('No show data available (neither Trakt nor ShowHub)');
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
    setLocalEpisodeSelections(new Map());
    setPostTitle('');
    setPostBody('');
    setPostMentions([]);
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
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : null}
          {searchError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{searchError}</Text>
              <Pressable style={styles.retryButton} onPress={() => setSearchQuery(searchQuery + ' ')}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() === '' && isLoadingRecommendations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              <Text style={styles.loadingText}>Loading recommendations...</Text>
            </View>
          ) : null}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() === '' && !isLoadingRecommendations && cachedRecommendations.length > 0 ? (
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
          ) : null}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() === '' && !isLoadingRecommendations && cachedRecommendations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Start typing to search for shows</Text>
            </View>
          ) : null}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() !== '' ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No shows found</Text>
            </View>
          ) : null}
          {!isSearching && !searchError && showSearchResults.length > 0 ? (
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
          ) : null}
        </ScrollView>
      </View>
    );
  };

  const renderSelectEpisodes = () => (
    <View style={styles.stepContainer}>
      {!preselectedShow ? (
        <Pressable style={styles.backButton} onPress={() => setStep('selectShow')}>
          <IconSymbol name="chevron.left" size={20} color={tokens.colors.black} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      ) : null}
      <Text style={styles.stepTitle}>Select Episodes</Text>
      <Text style={styles.stepSubtitle}>Optional</Text>
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
            {season.expanded ? (
              <View style={styles.episodesContainer}>
                {season.episodes.map(episode => {
                  const episodeKey = getEpisodeKey(episode);
                  const isLogged = loggedEpisodeIds.has(episodeKey);
                  const isRewatched = rewatchedEpisodeIds.has(episodeKey);
                  const selectionState = localEpisodeSelections.get(episode.id) || (isRewatched ? 'rewatched' : (isLogged ? 'watched' : 'none'));
                  return (
                    <EpisodeListCard
                      key={episode.id}
                      episodeNumber={`S${episode.seasonNumber} E${episode.episodeNumber}`}
                      title={episode.title}
                      description={episode.description}
                      thumbnail={episode.thumbnail}
                      selectionState={selectionState}
                      isLogged={isLogged}
                      onPress={() => handleEpisodeToggle(episode)}
                      onToggleSelect={() => handleEpisodeToggle(episode)}
                      theme="light"
                    />
                  );
                })}
              </View>
            ) : null}
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

  const renderPostDetails = () => {
    const tagMap = {
      'Fan Theory': 'Fan_Theory',
      'Discussion': 'Discussion',
      'Spoiler Alert': 'Spoiler',
      'Episode Recap': 'Episode_Recap',
      'Misc': 'Misc',
    };

    const handleCustomTagPress = () => {
      setIsEditingCustomTag(true);
      setTimeout(() => customTagInputRef.current?.focus(), 100);
    };

    const handleCustomTagBlur = () => {
      if (customTag.trim()) {
        handleAddCustomTag();
      }
      setIsEditingCustomTag(false);
    };

    return (
      <View style={styles.stepContainer}>
        <Pressable style={styles.backButton} onPress={() => setStep('selectEpisodes')}>
          <IconSymbol name="chevron.left" size={20} color={tokens.colors.black} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.stepTitle}>Log Details</Text>
        <ScrollView style={styles.detailsForm} showsVerticalScrollIndicator={false}>
          
          {/* Rating Section - FIRST */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>Rating</Text>
            <HalfStarRating rating={rating} onRatingChange={setRating} />
          </View>

          {/* Title Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabelRow}>
              <Text style={styles.inputLabelText}>Title</Text>
              <Text style={styles.inputLabelOptional}> (Optional)</Text>
            </Text>
            <TextInput
              style={styles.titleInput}
              placeholder="That episode was insane"
              placeholderTextColor={tokens.colors.grey1}
              value={postTitle}
              onChangeText={setPostTitle}
            />
          </View>

          {/* Body Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabelRow}>
              <Text style={styles.inputLabelText}>Body</Text>
              <Text style={styles.inputLabelOptional}> (Optional)</Text>
            </Text>
            <MentionInput
              style={styles.bodyInput}
              placeholder="Tell us how it made you feel"
              placeholderTextColor={tokens.colors.grey1}
              value={postBody}
              onChangeText={(text, mentions) => {
                setPostBody(text);
                setPostMentions(mentions);
              }}
              currentUserId={currentUser.id}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Tags Section */}
          <View style={styles.tagsSection}>
            <Text style={styles.sectionLabel}>Tags</Text>
            {!canSelectTags ? (
              <Text style={styles.tagsHelperText}>Write a title or body text to select a tag</Text>
            ) : null}
            <View style={styles.tagsContainer}>
              {Object.entries(tagMap).map(([displayName, stateName]) => {
                const isSelected = selectedTags.includes(displayName);
                return (
                  <PostTags
                    key={displayName}
                    prop="Small"
                    state={stateName as any}
                    text={displayName}
                    onPress={() => handleTagToggle(displayName)}
                    style={isSelected ? { opacity: 1, borderWidth: 2 } : styles.tagUnselected}
                  />
                );
              })}
              {customTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <PostTags
                    key={tag}
                    prop="Small"
                    state="Custom"
                    text={tag}
                    onPress={() => handleTagToggle(tag)}
                    style={isSelected ? { opacity: 1, borderWidth: 2 } : styles.tagUnselected}
                  />
                );
              })}
              
              {/* Custom Tag - Editable */}
              {isEditingCustomTag ? (
                <View style={styles.customTagEditing}>
                  <TextInput
                    ref={customTagInputRef}
                    style={styles.customTagInput}
                    placeholder="Type here"
                    placeholderTextColor={tokens.colors.grey1}
                    value={customTag}
                    onChangeText={setCustomTag}
                    onBlur={handleCustomTagBlur}
                    onSubmitEditing={handleCustomTagBlur}
                    returnKeyType="done"
                    autoFocus
                  />
                </View>
              ) : (
                <PostTags
                  prop="Small"
                  state="Custom"
                  text="Custom"
                  onPress={handleCustomTagPress}
                />
              )}
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
  };

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
      
      {selectedShowForPlaylist ? (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShowForPlaylist(null);
          }}
          show={selectedShowForPlaylist}
          onAddToPlaylist={() => {}}
        />
      ) : null}
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
    ...tokens.typography.smallSubtitle,
    color: tokens.colors.grey1,
    marginBottom: spacing.gapLarge,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapLarge,
  },
  backButtonText: {
    ...tokens.typography.p3R,
    color: tokens.colors.black,
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
    marginBottom: 6,
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
  inputSection: {
    marginBottom: 16,
  },
  inputLabelRow: {
    marginBottom: 8,
  },
  inputLabelText: {
    fontSize: 13,
    fontFamily: 'Funnel Display',
    fontWeight: '500',
    color: tokens.colors.black,
  },
  inputLabelOptional: {
    fontSize: 13,
    fontFamily: 'Funnel Display',
    fontWeight: '300',
    color: tokens.colors.grey1,
  },
  titleInput: {
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    paddingVertical: 8,
    paddingHorizontal: 20,
    ...tokens.typography.p1,
    color: tokens.colors.black,
    height: 46,
  },
  bodyInput: {
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    paddingVertical: 8,
    paddingHorizontal: 20,
    ...tokens.typography.p1,
    color: tokens.colors.black,
    minHeight: 313,
    textAlignVertical: 'top',
  },
  ratingSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    ...tokens.typography.smallSubtitle,
    color: tokens.colors.black,
    marginBottom: 12,
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
  tagsSection: {
    marginBottom: 24,
  },
  tagsHelperText: {
    fontSize: 13,
    fontFamily: 'Funnel Display',
    fontWeight: '300',
    color: tokens.colors.grey1,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagSelected: {
    opacity: 1,
  },
  tagUnselected: {
    opacity: 0.6,
  },
  tagSelectedBorder: {
    borderWidth: 2,
  },
  customTagEditing: {
    flexDirection: 'row',
    paddingTop: 5,
    paddingLeft: 9,
    paddingBottom: 5,
    paddingRight: 9,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    borderWidth: 0.25,
    borderStyle: 'solid',
    borderColor: tokens.colors.grey3,
    backgroundColor: tokens.colors.almostWhite,
    minWidth: 80,
  },
  customTagInput: {
    ...tokens.typography.p3M,
    color: tokens.colors.grey3,
    padding: 0,
    margin: 0,
    minWidth: 60,
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
