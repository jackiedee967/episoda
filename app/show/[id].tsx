import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
import ShowRatingModal from '@/components/ShowRatingModal';
import FriendsWatchingModal from '@/components/FriendsWatchingModal';
import TabSelector, { Tab } from '@/components/TabSelector';
import EpisodeCard from '@/components/EpisodeCard';
import EpisodeListCard from '@/components/EpisodeListCard';
import FloatingTabBar from '@/components/FloatingTabBar';
import ShowsEpisodeProgressBar from '@/components/ShowsEpisodeProgressBar';
import { mockShows, mockUsers } from '@/data/mockData';
import FadeInView from '@/components/FadeInView';
import FadeInImage from '@/components/FadeInImage';
import { Episode, Show } from '@/types';
import { useData } from '@/contexts/DataContext';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getShowById, DatabaseShow, getEpisodesByShowId, DatabaseEpisode, upsertEpisodeMetadata, saveShow } from '@/services/showDatabase';
import { getAllEpisodes, getShowDetails, fetchShowEndYear } from '@/services/trakt';
import { getBackdropUrl as getTVMazeBackdrop } from '@/services/tvmaze';
import { getEpisode, getAllEpisodes as getAllTVMazeEpisodes } from '@/services/tvmaze';
import { getPosterUrl, getBackdropUrl } from '@/utils/posterPlaceholderGenerator';
import { convertToFiveStarRating } from '@/utils/ratingConverter';
import { supabase } from '@/integrations/supabase/client';
import { processBatched } from '@/utils/batchOperations';
import { getWatchProviders, getProviderLogoUrl, findTMDBIdByName, WatchProvider } from '@/services/tmdb';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || 
                     (Constants as any).manifest?.extra?.SUPABASE_URL || 
                     process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || 
                          (Constants as any).manifest?.extra?.SUPABASE_ANON_KEY || 
                          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function callRPC(functionName: string, params: Record<string, any>): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  console.log(`📡 RPC call: ${functionName}`, { url: url.substring(0, 50) + '...', params });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY || '',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(params),
  });
  
  const text = await response.text();
  console.log(`📡 RPC response: ${functionName}`, { status: response.status, body: text.substring(0, 100) });
  
  if (!response.ok) {
    let errorMessage = `RPC call failed with status ${response.status}`;
    try {
      const error = JSON.parse(text);
      errorMessage = error.message || error.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
  
  return text ? JSON.parse(text) : null;
}

type TabKey = 'friends' | 'all' | 'episodes';

interface SeasonData {
  seasonNumber: number;
  episodes: Episode[];
  expanded: boolean;
}

function mapDatabaseShowToShow(dbShow: DatabaseShow): Show {
  console.log('📺 ShowHub mapping:', { 
    title: dbShow.title, 
    year: dbShow.year, 
    backdrop: dbShow.backdrop_url ? 'has backdrop' : 'no backdrop' 
  });
  return {
    id: dbShow.id,
    traktId: dbShow.trakt_id,
    title: dbShow.title,
    year: dbShow.year || undefined,
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
  const [refreshing, setRefreshing] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [streamingProviders, setStreamingProviders] = useState<WatchProvider[]>([]);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [userShowRating, setUserShowRating] = useState<number>(0);
  const [showRatingForPost, setShowRatingForPost] = useState<number>(0);
  const [communityRating, setCommunityRating] = useState<{ average: number; count: number } | null>(null);
  const endYearFetchedRef = React.useRef<string | null>(null); // Track which show we've fetched end year for
  const providersFetchedRef = React.useRef<string | null>(null); // Track which show we've fetched providers for

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

  // Load logged episodes from posts table (watch history)
  useEffect(() => {
    async function loadLoggedEpisodes() {
      if (!show || !currentUser || !show.id) {
        setLoggedEpisodeIds(new Set());
        return;
      }

      try {
        console.log('🔍 Querying posts for user:', currentUser.id, 'show:', show.id, show.title);
        
        // Query posts to get episode IDs
        const { data: userPosts, error: postsError } = await supabase
          .from('posts')
          .select('episode_ids')
          .eq('user_id', currentUser.id)
          .eq('show_id', show.id);

        if (postsError) {
          console.error('❌ Error loading posts:', postsError);
          return;
        }

        if (!userPosts || userPosts.length === 0) {
          console.log('ℹ️ No logged episodes found for this show');
          setLoggedEpisodeIds(new Set());
          return;
        }

        // Collect all episode UUIDs from posts
        const episodeUUIDs = new Set<string>();
        userPosts.forEach((post: any) => {
          post.episode_ids?.forEach((id: string) => episodeUUIDs.add(id));
        });

        // Fetch episode details to map to Trakt-style IDs
        const { data: episodesData, error: episodesError } = await supabase
          .from('episodes')
          .select('id, season_number, episode_number')
          .in('id', Array.from(episodeUUIDs));

        if (episodesError) {
          console.error('❌ Error loading episodes:', episodesError);
          return;
        }

        // Build episode IDs in the format used by ShowHub: `${trakt_show_id}-S${season}E${episode}`
        const dbShow = await getShowById(show.id);
        if (!dbShow || !dbShow.trakt_id) {
          console.error('❌ Show missing Trakt ID');
          return;
        }

        const loggedIds = new Set<string>();
        (episodesData || []).forEach((ep: any) => {
          const episodeId = `${dbShow.trakt_id}-S${ep.season_number}E${ep.episode_number}`;
          loggedIds.add(episodeId);
        });

        console.log(`✅ Loaded ${loggedIds.size} logged episodes for ${show.title}`);
        setLoggedEpisodeIds(loggedIds);
      } catch (error) {
        console.error('❌ Error loading logged episodes:', error);
      }
    }

    loadLoggedEpisodes();
  }, [currentUser, show?.id, posts]);

  // Load user's existing show rating
  useEffect(() => {
    async function loadUserShowRating() {
      if (!show || !currentUser?.id) {
        setUserShowRating(0);
        return;
      }

      try {
        const data = await callRPC('get_user_show_rating', {
          p_user_id: currentUser.id,
          p_show_id: show.id
        });

        if (data !== null) {
          setUserShowRating(Number(data));
          console.log(`✅ User has rated ${show.title}: ${data} stars`);
        } else {
          setUserShowRating(0);
        }
      } catch (err) {
        console.error('Error loading user show rating:', err);
        setUserShowRating(0);
      }
    }

    loadUserShowRating();
  }, [show?.id, currentUser?.id]);

  // Load community ratings (average and count) for this show - efficient aggregation
  useEffect(() => {
    async function loadCommunityRating() {
      if (!show?.id) {
        setCommunityRating(null);
        return;
      }

      try {
        // Get show_ratings stats using direct RPC call
        let showRatingCount = 0;
        let showRatingAvg = null;
        
        try {
          const showRatingStats = await callRPC('get_show_rating_stats', {
            p_show_id: show.id
          });
          showRatingCount = showRatingStats?.[0]?.rating_count || 0;
          showRatingAvg = showRatingStats?.[0]?.avg_rating;
        } catch (rpcError) {
          console.error('Error getting show rating stats:', rpcError);
        }

        // Count post ratings for this show
        const { count: postRatingCount, error: postCountError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('show_id', show.id)
          .gt('rating', 0);

        if (postCountError) {
          console.error('Error counting post ratings:', postCountError);
        }

        const totalCount = Number(showRatingCount || 0) + (postRatingCount || 0);

        // Only fetch actual ratings if we have enough for community rating (10+)
        if (totalCount >= 10) {
          // If we have enough show ratings alone, use that average
          // Otherwise, combine with post ratings
          if (showRatingCount >= 10 && showRatingAvg) {
            setCommunityRating({ average: Number(showRatingAvg), count: totalCount });
            console.log(`✅ Community rating for ${show.title}: ${Number(showRatingAvg).toFixed(1)} (${totalCount} ratings)`);
          } else {
            // Need to include post ratings - fetch them
            const { data: postRatings } = await supabase
              .from('posts')
              .select('rating')
              .eq('show_id', show.id)
              .gt('rating', 0);

            const allRatings: number[] = [];
            
            // Add weighted show ratings
            if (showRatingCount > 0 && showRatingAvg) {
              for (let i = 0; i < Number(showRatingCount); i++) {
                allRatings.push(Number(showRatingAvg));
              }
            }
            
            if (postRatings) {
              postRatings.forEach((r: any) => allRatings.push(Number(r.rating)));
            }

            if (allRatings.length > 0) {
              const average = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
              setCommunityRating({ average, count: allRatings.length });
              console.log(`✅ Community rating for ${show.title}: ${average.toFixed(1)} (${allRatings.length} ratings)`);
            }
          }
        } else if (totalCount > 0) {
          // Less than 10 ratings - store count but we'll use API rating
          setCommunityRating({ average: 0, count: totalCount });
          console.log(`📊 ${show.title} has ${totalCount} ratings (needs 10+ for community average)`);
        } else {
          setCommunityRating(null);
        }
      } catch (err) {
        console.error('Error loading community ratings:', err);
        setCommunityRating(null);
      }
    }

    loadCommunityRating();
  }, [show?.id, userShowRating]);

  useEffect(() => {
    async function loadShow() {
      if (!id || typeof id !== 'string') return;

      setShow(null);
      setLoadingShow(true);
      setBannerFailed(false);
      setShowError(null);

      try {
        const dbShow = await getShowById(id);

        if (dbShow) {
          setShow(mapDatabaseShowToShow(dbShow));
          
          // Check if show data is incomplete and needs refresh
          // Note: endYear is fetched during refresh but not persisted due to PostgREST cache
          const isIncomplete = !dbShow.year || 
                              !dbShow.description || 
                              dbShow.description === 'No description available.' ||
                              !dbShow.backdrop_url;
          
          if (isIncomplete && dbShow.trakt_id) {
            console.log('🔄 Show data incomplete, refreshing from Trakt...', {
              title: dbShow.title,
              hasYear: !!dbShow.year,
              hasDescription: !!dbShow.description && dbShow.description !== 'No description available.',
              hasBackdrop: !!dbShow.backdrop_url
            });
            
            // Fetch fresh data in background (don't block UI)
            // This also fetches endYear for year range display
            refreshShowData(dbShow);
          }
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
    
    async function refreshShowData(dbShow: DatabaseShow) {
      try {
        // Fetch fresh show data from Trakt
        let traktShow;
        try {
          traktShow = await getShowDetails(dbShow.trakt_id);
        } catch (fetchError) {
          console.warn('⚠️ Failed to fetch show from Trakt, skipping refresh:', fetchError);
          return; // Exit gracefully - don't attempt updates with missing data
        }
        
        // Defensive check - ensure we got valid data
        if (!traktShow || !traktShow.title) {
          console.warn('⚠️ Trakt returned invalid data, skipping refresh');
          return;
        }
        
        // Fetch end year from last episode air date (separate error handling)
        let endYear: number | undefined;
        try {
          endYear = await fetchShowEndYear(traktShow);
          console.log('✅ Got fresh Trakt data:', { 
            title: traktShow.title, 
            year: traktShow.year,
            endYear: endYear,
            status: traktShow.status,
            hasOverview: !!traktShow.overview
          });
        } catch (endYearError) {
          console.warn('⚠️ Failed to fetch end year:', endYearError);
          console.log('✅ Got fresh Trakt data (without end year):', { 
            title: traktShow.title, 
            year: traktShow.year,
            status: traktShow.status,
            hasOverview: !!traktShow.overview
          });
        }
        
        // Fetch backdrop from TVMaze if we have the ID (with separate error handling)
        let backdropUrl = dbShow.backdrop_url;
        if (!backdropUrl && dbShow.tvmaze_id) {
          try {
            backdropUrl = await getTVMazeBackdrop(dbShow.tvmaze_id);
            console.log('🖼️ Got backdrop from TVMaze:', backdropUrl ? 'yes' : 'no');
          } catch (backdropError) {
            console.warn('⚠️ Failed to fetch backdrop from TVMaze:', backdropError);
            // Continue with refresh - backdrop is optional
          }
        }
        
        // Update database with fresh data - use only columns cached in PostgREST schema
        // Note: year/end_year columns may not be in PostgREST cache, so we update via description only
        const updateData: Record<string, any> = {
          description: traktShow.overview || dbShow.description,
          backdrop_url: backdropUrl || dbShow.backdrop_url,
          rating: traktShow.rating ? Number(traktShow.rating.toFixed(1)) : dbShow.rating,
          updated_at: new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('shows')
          .update(updateData)
          .eq('id', dbShow.id);
        
        if (error) {
          console.error('❌ Failed to update show:', error);
          return;
        }
        
        console.log('✅ Show data refreshed successfully');
        
        // Update local state with refreshed data (including year/endYear from Trakt for UI display)
        setShow(prev => prev ? {
          ...prev,
          year: traktShow.year || prev.year,
          endYear: endYear || prev.endYear,
          description: traktShow.overview || prev.description,
          backdrop: backdropUrl || prev.backdrop,
          rating: traktShow.rating ? Number(traktShow.rating.toFixed(1)) : prev.rating,
        } : null);
        
      } catch (error) {
        console.error('❌ Error refreshing show data:', error);
        // Graceful exit - show continues with existing data
      }
    }

    loadShow();
  }, [id]);

  // Separate effect to fetch end year for shows that have complete data but missing endYear
  // This runs once per show visit and doesn't cause perpetual refresh loops
  useEffect(() => {
    async function fetchEndYearIfNeeded() {
      // Skip if no show, already has endYear, or we've already fetched for this show
      if (!show || show.endYear || !show.year || !show.traktId) return;
      if (endYearFetchedRef.current === show.id) return;
      
      // Mark that we're fetching for this show (prevent duplicate calls)
      endYearFetchedRef.current = show.id;
      
      try {
        console.log('📅 Fetching end year for:', show.title);
        const traktShow = await getShowDetails(show.traktId);
        if (!traktShow) return;
        
        const endYear = await fetchShowEndYear(traktShow);
        if (endYear && endYear !== show.year) {
          console.log('✅ Got end year:', endYear, 'for', show.title);
          setShow(prev => prev ? { ...prev, endYear } : null);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch end year:', error);
      }
    }
    
    fetchEndYearIfNeeded();
  }, [show?.id, show?.year, show?.endYear, show?.traktId]);

  // Fetch streaming providers once per show visit
  useEffect(() => {
    async function fetchStreamingProviders() {
      if (!show || !show.title) return;
      if (providersFetchedRef.current === show.id) return;
      
      // Mark that we're fetching for this show
      providersFetchedRef.current = show.id;
      
      // Clear previous providers immediately to prevent stale data
      setStreamingProviders([]);
      
      try {
        // Find TMDB ID using show name and year
        const tmdbId = await findTMDBIdByName(show.title, show.year);
        if (!tmdbId) {
          console.log('⚠️ Could not find TMDB ID for:', show.title);
          return;
        }
        
        const providers = await getWatchProviders(tmdbId, 'US');
        setStreamingProviders(providers); // Set to whatever we get (empty or full)
      } catch (error) {
        console.warn('⚠️ Failed to fetch streaming providers:', error);
        setStreamingProviders([]); // Clear on error
      }
    }
    
    fetchStreamingProviders();
  }, [show?.id, show?.title, show?.year]);
  
  // Reset streaming providers when show changes
  useEffect(() => {
    if (id) {
      setStreamingProviders([]);
      providersFetchedRef.current = null;
    }
  }, [id]);

  useEffect(() => {
    async function loadEpisodes() {
      if (!show?.id) return;
      
      const dbShow = await getShowById(show.id);
      if (!dbShow) {
        console.error('Show not found in database');
        return;
      }
      
      setSeasons([]);
      setLoadingEpisodes(true);
      
      try {
        // Try to fetch from Trakt first if we have a Trakt ID
        if (dbShow.trakt_id) {
          try {
            console.log('📺 Fetching episodes from Trakt API...');
            const traktEpisodes = await getAllEpisodes(dbShow.trakt_id);
            
            if (traktEpisodes && traktEpisodes.length > 0) {
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
              console.log('✅ Loaded', mappedEpisodes.length, 'episodes from Trakt');
              
              // Fetch thumbnails in background with BATCHED processing to prevent overwhelming Supabase
              if (dbShow.tvmaze_id) {
                // Check database first for existing episode metadata
                console.log('🔍 Checking database for existing episode metadata...');
                const existingEpisodes = await getEpisodesByShowId(show.id);
                const existingEpisodeKeys = new Set(
                  existingEpisodes.map(ep => `S${ep.season_number}E${ep.episode_number}`)
                );
                
                console.log(`📊 Found ${existingEpisodes.length} episodes already in database (will skip these)`);
                
                // Map existing episodes to display immediately
                const episodesWithExistingData = mappedEpisodes.map(ep => {
                  const key = `S${ep.seasonNumber}E${ep.episodeNumber}`;
                  const existingEp = existingEpisodes.find(
                    e => e.season_number === ep.seasonNumber && e.episode_number === ep.episodeNumber
                  );
                  
                  return existingEp ? {
                    ...ep,
                    thumbnail: existingEp.thumbnail_url || undefined,
                    title: existingEp.title || ep.title,
                    description: existingEp.description || ep.description,
                  } : ep;
                });
                
                setEpisodes(episodesWithExistingData);
                
                // Only fetch missing thumbnails to reduce API calls
                const episodesToUpdate = mappedEpisodes
                  .map((ep, index) => ({ ep, index }))
                  .filter(({ ep }) => !existingEpisodeKeys.has(`S${ep.seasonNumber}E${ep.episodeNumber}`));
                
                if (episodesToUpdate.length > 0) {
                  console.log(`🔄 Starting batched updates for ${episodesToUpdate.length} missing episodes (15 per batch, 100ms delay)`);
                  
                  const updatedEpisodes = await processBatched(
                    episodesToUpdate,
                    async ({ ep, index }) => {
                      try {
                        const traktEpisode = traktEpisodes[index];
                        const tvmazeEpisode = await getEpisode(
                          dbShow.tvmaze_id!,
                          ep.seasonNumber,
                          ep.episodeNumber
                        );
                        const thumbnailUrl = tvmazeEpisode?.image?.original || null;
                        
                        // Save to database for persistence
                        try {
                          await upsertEpisodeMetadata(show.id, ep.seasonNumber, ep.episodeNumber, {
                            title: traktEpisode.title || ep.title,
                            description: traktEpisode.overview || ep.description,
                            thumbnail_url: thumbnailUrl || undefined,
                            trakt_id: traktEpisode.ids.trakt,
                            imdb_id: traktEpisode.ids.imdb,
                            tvdb_id: traktEpisode.ids.tvdb,
                            tmdb_id: traktEpisode.ids.tmdb,
                            rating: traktEpisode.rating ? Number(traktEpisode.rating.toFixed(1)) : undefined,
                          });
                        } catch (dbError) {
                          console.error(`Failed to save metadata for S${ep.seasonNumber}E${ep.episodeNumber}:`, dbError);
                        }
                        
                        return {
                          ...ep,
                          thumbnail: thumbnailUrl || undefined,
                        };
                      } catch (error) {
                        console.error(`Error fetching thumbnail for S${ep.seasonNumber}E${ep.episodeNumber}:`, error);
                        return ep;
                      }
                    },
                    { batchSize: 15, delayMs: 100 }
                  );
                  
                  // Merge updated episodes back into the full list
                  const finalEpisodes = episodesWithExistingData.map(ep => {
                    const updated = updatedEpisodes.find(
                      u => u.seasonNumber === ep.seasonNumber && u.episodeNumber === ep.episodeNumber
                    );
                    return updated || ep;
                  });
                  
                  console.log('✅ Completed batched metadata updates');
                  setEpisodes(finalEpisodes);
                } else {
                  console.log('✅ All episode metadata already cached - no updates needed');
                }
              }
              return;
            }
          } catch (traktError) {
            console.error('❌ Trakt API failed, trying TVMaze fallback...', traktError);
          }
        }
        
        // Second fallback: Try TVMaze if we have a TVMaze ID
        if (dbShow.tvmaze_id) {
          try {
            console.log('📺 Fetching ALL episodes from TVMaze API...');
            const tvmazeEpisodes = await getAllTVMazeEpisodes(dbShow.tvmaze_id);
            
            if (tvmazeEpisodes && tvmazeEpisodes.length > 0) {
              const mappedEpisodes = tvmazeEpisodes.map((ep) => ({
                id: dbShow.trakt_id 
                  ? `${dbShow.trakt_id}-S${ep.season}E${ep.number}`
                  : `tvmaze-${dbShow.tvmaze_id}-S${ep.season}E${ep.number}`,
                showId: show.id,
                seasonNumber: ep.season,
                episodeNumber: ep.number,
                title: ep.name || `Episode ${ep.number}`,
                description: ep.summary?.replace(/<[^>]+>/g, '') || 'No description available.',
                rating: 0,
                postCount: 0,
                thumbnail: ep.image?.original || undefined,
              }));
              
              setEpisodes(mappedEpisodes);
              setLoadingEpisodes(false);
              console.log('✅ Loaded', mappedEpisodes.length, 'episodes from TVMaze');
              return;
            }
          } catch (tvmazeError) {
            console.error('❌ TVMaze API also failed, falling back to logged episodes only:', tvmazeError);
          }
        }
        
        // Final fallback: Load only logged episodes from Supabase database
        console.log('💾 Loading logged episodes from Supabase database...');
        const dbEpisodes = await getEpisodesByShowId(show.id);
        
        if (dbEpisodes && dbEpisodes.length > 0) {
          // CRITICAL: Use Trakt-style IDs for consistency with logged episode tracking
          const mappedEpisodes = dbEpisodes.map(ep => ({
            ...mapDatabaseEpisodeToEpisode(ep),
            id: dbShow.trakt_id 
              ? `${dbShow.trakt_id}-S${ep.season_number}E${ep.episode_number}`
              : ep.id, // Fallback to UUID if no Trakt ID (rare edge case)
          }));
          setEpisodes(mappedEpisodes);
          console.log('✅ Loaded', mappedEpisodes.length, 'logged episodes from Supabase');
          
          // Background refresh: Update ALL metadata (titles, descriptions, thumbnails) from Trakt + TVMaze
          if (dbShow.trakt_id || dbShow.tvmaze_id) {
            console.log('🔄 Refreshing episode metadata in background...');
            
            // Fetch all Trakt episodes once (not per episode)
            let traktEpisodesMap: Map<string, any> | null = null;
            if (dbShow.trakt_id) {
              try {
                const allEpisodes = await getAllEpisodes(dbShow.trakt_id);
                if (allEpisodes) {
                  traktEpisodesMap = new Map(
                    allEpisodes.map(ep => [`S${ep.season}E${ep.number}`, ep])
                  );
                }
              } catch (traktError) {
                console.error('Error fetching all Trakt episodes:', traktError);
              }
            }
            
            Promise.all(
              dbEpisodes.map(async (dbEp) => {
                try {
                  let updatedTitle = dbEp.title;
                  let updatedDescription = dbEp.description;
                  let updatedThumbnail = dbEp.thumbnail_url;
                  let shouldUpdate = false;
                  
                  // Get fresh metadata from Trakt map
                  if (traktEpisodesMap) {
                    const traktEpisode = traktEpisodesMap.get(`S${dbEp.season_number}E${dbEp.episode_number}`);
                    if (traktEpisode) {
                      updatedTitle = traktEpisode.title || dbEp.title;
                      updatedDescription = traktEpisode.overview || dbEp.description;
                      shouldUpdate = true;
                    }
                  }
                  
                  // Always fetch thumbnail from TVMaze to ensure continuous updates
                  if (dbShow.tvmaze_id) {
                    const tvmazeEpisode = await getEpisode(
                      dbShow.tvmaze_id,
                      dbEp.season_number,
                      dbEp.episode_number
                    );
                    const freshThumbnail = tvmazeEpisode?.image?.original || null;
                    // Always persist the latest fetch (even if unchanged) to guarantee freshness
                    updatedThumbnail = freshThumbnail;
                    shouldUpdate = true;
                  }
                  
                  // Update database if we have new metadata
                  if (shouldUpdate) {
                    await upsertEpisodeMetadata(show.id, dbEp.season_number, dbEp.episode_number, {
                      title: updatedTitle,
                      description: updatedDescription || '',
                      thumbnail_url: updatedThumbnail || undefined,
                      trakt_id: dbEp.trakt_id || undefined,
                      imdb_id: dbEp.imdb_id || undefined,
                      tvdb_id: dbEp.tvdb_id || undefined,
                      tmdb_id: dbEp.tmdb_id || undefined,
                      rating: dbEp.rating || undefined,
                    });
                    
                    // Update the displayed episode
                    setEpisodes(prev => prev.map(ep => 
                      ep.seasonNumber === dbEp.season_number && ep.episodeNumber === dbEp.episode_number
                        ? { 
                            ...ep, 
                            title: updatedTitle,
                            description: updatedDescription || '',
                            thumbnail: updatedThumbnail || undefined 
                          }
                        : ep
                    ));
                  }
                } catch (error) {
                  console.error(`Error refreshing S${dbEp.season_number}E${dbEp.episode_number}:`, error);
                }
              })
            ).then(() => {
              console.log('✅ Background metadata refresh complete');
            });
          }
        } else {
          console.log('⚠️ No episodes found in database');
          setEpisodes([]);
        }
        
        setLoadingEpisodes(false);
      } catch (error) {
        console.error('❌ Error loading episodes:', error);
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

      // Smart season expansion: Find first season with unwatched episodes
      let expandIndex = seasonsData.length - 1;
      for (let i = 0; i < seasonsData.length; i++) {
        const season = seasonsData[i];
        const hasUnwatchedEpisode = season.episodes.some(ep => !loggedEpisodeIds.has(ep.id));
        
        if (hasUnwatchedEpisode) {
          expandIndex = i;
          break;
        }
      }
      
      seasonsData[expandIndex].expanded = true;

      setSeasons(seasonsData);
      console.log(`✅ Smart season expansion: Opened Season ${seasonsData[expandIndex].seasonNumber} (first with unwatched episodes)`);
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
    
    // Navigate to the post page
    router.push(`/post/${postId}`);
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
      setShowRatingForPost(0);
    }, 300);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    setIsInPlaylist(true);
  };

  const handleRefresh = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setRefreshing(true);
    try {
      // Reload show data
      const dbShow = await getShowById(id);
      if (dbShow) {
        setShow(mapDatabaseShowToShow(dbShow));
      }
      
      // Episodes will be reloaded by the useEffect watching show.id
    } catch (error) {
      console.error('Error refreshing show:', error);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  // Silent auto-refresh when page comes into focus (no spinner)
  useFocusEffect(
    useCallback(() => {
      const silentRefresh = async () => {
        if (!id || typeof id !== 'string') return;
        
        try {
          const dbShow = await getShowById(id);
          if (dbShow) {
            setShow(mapDatabaseShowToShow(dbShow));
          }
        } catch (error) {
          console.error('Error auto-refreshing show:', error);
        }
      };
      
      silentRefresh();
    }, [id])
  );

  const isShowSaved = useMemo(() => {
    if (!show) return false;
    return playlists.some(pl => isShowInPlaylist(pl.id, show.id));
  }, [playlists, show, isShowInPlaylist]);

  const renderBanner = () => {
    if (!show) return null;
    
    // Check RAW backdrop value - if null/undefined/empty, don't show banner at all
    // Also hide if backdrop duplicates poster, or if image failed to load
    const hasBackdrop = show.backdrop && show.backdrop.trim() !== '';
    const isDuplicateArt = hasBackdrop && show.poster && show.backdrop === show.poster;
    
    if (!hasBackdrop || isDuplicateArt || bannerFailed) {
      return (
        <View style={styles.noBannerHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButtonNoBanner}>
            <ChevronLeft size={18} color={tokens.colors.pureWhite} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Pressable onPress={handleSearchInShow} style={styles.searchButtonNoBanner}>
            <SearchDuotoneLine />
          </Pressable>
        </View>
      );
    }
    
    return (
      <View style={styles.bannerContainer}>
        <Image 
          source={{ uri: show.backdrop }} 
          style={styles.bannerImage}
          contentFit="cover"
          onError={() => setBannerFailed(true)}
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

  const getYearRange = () => {
    if (!show?.year) return null;
    
    // If we have endYear from show data, use it
    if (show.endYear && show.endYear !== show.year) {
      return `${show.year} - ${show.endYear}`;
    }
    
    // Otherwise just return the start year
    return String(show.year);
  };

  const renderShowInfo = () => {
    const totalSeasons = calculateSeasonCount() || show.totalSeasons || 0;
    const totalEpisodes = calculateEpisodeCount() || show.totalEpisodes || 0;
    const yearRange = getYearRange();

    return (
      <View style={styles.showInfoContainer}>
        <View style={styles.showDetailsRow}>
          <View style={styles.posterWrapper}>
            <FadeInImage source={{ uri: getPosterUrl(show.poster, show.title) }} style={styles.poster} contentFit="cover" />
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
                name={isShowSaved ? "bookmark.fill" : "bookmark"} 
                size={18} 
                color={tokens.colors.pureWhite} 
              />
            </Pressable>
          </View>
          <View style={styles.detailsColumn}>
            <View style={styles.yearAndProvidersRow}>
              {yearRange && (
                <Text style={styles.yearRange}>{yearRange}</Text>
              )}
              {streamingProviders.length > 0 && (
                <View style={styles.streamingProvidersRow}>
                  {streamingProviders.slice(0, 5).map((provider) => (
                    <View key={provider.provider_id} style={styles.providerLogoContainer}>
                      <Image
                        source={{ uri: getProviderLogoUrl(provider.logo_path) }}
                        style={styles.providerLogo}
                        contentFit="cover"
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.showTitleInside}>{show.title}</Text>
            <Text style={styles.description} numberOfLines={6}>
              {show.description}
            </Text>
            <View style={styles.statsRow}>
              <Pressable 
                style={({ pressed }) => [
                  styles.ratingContainer,
                  pressed && styles.ratingContainerPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRatingModalVisible(true);
                }}
              >
                {userShowRating > 0 ? (
                  <>
                    <Text style={styles.ratingText}>{userShowRating.toFixed(1)}</Text>
                    <Text style={[styles.starIcon, styles.userRatedStar]}>★</Text>
                  </>
                ) : communityRating && communityRating.count >= 10 && communityRating.average > 0 ? (
                  <>
                    <Text style={styles.ratingText}>{communityRating.average.toFixed(1)}</Text>
                    <Text style={[styles.starIcon, styles.communityRatingStar]}>★</Text>
                  </>
                ) : show.rating > 0 ? (
                  <>
                    <Text style={styles.ratingText}>
                      {convertToFiveStarRating(show.rating).toFixed(1)}
                    </Text>
                    <Text style={styles.starIcon}>★</Text>
                  </>
                ) : (
                  <Text style={styles.rateShowText}>Rate</Text>
                )}
              </Pressable>
              <Text style={styles.statText}>{totalSeasons} {totalSeasons === 1 ? 'Season' : 'Seasons'}</Text>
              <Text style={styles.statText}>{totalEpisodes} {totalEpisodes === 1 ? 'Episode' : 'Episodes'}</Text>
            </View>
            {friendsWatching.length > 0 ? (
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
            ) : null}
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
      <FadeInView>
        <ShowsEpisodeProgressBar
          episodeNumber={mostRecentEpisode ? `S${mostRecentEpisode.seasonNumber} E${mostRecentEpisode.episodeNumber}` : undefined}
          episodeTitle={mostRecentEpisode?.title}
          loggedCount={loggedCount}
          totalCount={totalCount}
          style={styles.progressBar}
        />
      </FadeInView>
    );
  };

  const renderLogButton = () => {
    const handleLogButtonPress = () => {
      if (!show) return;
      
      // Get selected episodes (if any)
      const episodesToLog = Array.from(selectedEpisodeIds);
      const episodes = showEpisodes.filter(ep => episodesToLog.includes(ep.id));
      
      // Open modal with preselected show and episodes (if any selected)
      setModalVisible(true);
      
      // If no episodes selected, user will be able to select from modal
      // If episodes selected, modal will go straight to rating page
    };
    
    return (
      <Pressable style={styles.logButton} onPress={handleLogButtonPress}>
        <Text style={styles.logButtonText}>Log an episode</Text>
      </Pressable>
    );
  };

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

      {season.expanded ? (
        <View style={styles.episodesList}>
          {season.episodes.map(episode => renderEpisodeRow(episode))}
        </View>
      ) : null}
    </View>
  );

  const renderFeed = () => {
    const filteredPosts = filteredAndSortedPosts;

    return (
      <View style={styles.feedContainer}>
        {activeTab !== 'episodes' ? renderSortDropdown() : null}
        
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
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.almostWhite}
              colors={[tokens.colors.almostWhite]}
            />
          }
        >
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
        prefilledRating={showRatingForPost}
        skipToPostDetails={showRatingForPost > 0}
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
      <ShowRatingModal
        visible={ratingModalVisible}
        onClose={() => {
          setRatingModalVisible(false);
          // Reload user rating after modal closes
          if (currentUser?.id && show?.id) {
            callRPC('get_user_show_rating', {
              p_user_id: currentUser.id,
              p_show_id: show.id
            }).then((data) => {
              if (data !== null) {
                setUserShowRating(Number(data));
              }
            }).catch(err => {
              console.error('Error reloading user rating:', err);
            });
          }
        }}
        show={show}
        onShareAsPost={(rating) => {
          setShowRatingForPost(rating);
          setSelectedEpisode(undefined);
          setSelectedEpisodeIds(new Set());
          setModalVisible(true);
        }}
        existingRating={userShowRating}
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
        backgroundImage: "url('/images/show-hub-background.jpg')",
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
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
    alignItems: 'stretch',
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
  noBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  backButtonNoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
  },
  searchButtonNoBanner: {
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
  yearRange: {
    color: tokens.colors.grey1,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '300',
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
  yearAndProvidersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streamingProvidersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: tokens.colors.grey4,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
  },
  providerLogo: {
    width: 30,
    height: 30,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ratingContainerPressed: {
    opacity: 0.7,
  },
  ratingText: {
    color: tokens.colors.grey1,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '300',
  },
  starIcon: {
    color: tokens.colors.grey1,
    fontSize: 10,
  },
  userRatedStar: {
    color: tokens.colors.greenHighlight,
  },
  communityRatingStar: {
    color: '#FFD700',
  },
  rateShowText: {
    color: tokens.colors.grey1,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '300',
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
    width: '100%',
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
