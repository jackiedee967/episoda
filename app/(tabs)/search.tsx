import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, Platform, ImageBackground, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import TabSelector, { Tab } from '@/components/TabSelector';
import UserCard from '@/components/UserCard';
import { mockShows, mockUsers, mockComments } from '@/data/mockData';
import { Show, User, Comment } from '@/types';
import PlaylistModal from '@/components/PlaylistModal';
import { useData } from '@/contexts/DataContext';
import PostCard from '@/components/PostCard';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import tokens from '@/styles/tokens';
import { searchShows, TraktShow } from '@/services/trakt';
import { mapTraktShowToShow, mapDatabaseShowToShow, mapDatabaseShowToTraktShow } from '@/services/showMappers';
import { showEnrichmentManager } from '@/services/showEnrichment';
import { saveShow } from '@/services/showDatabase';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import { convertToFiveStarRating } from '@/utils/ratingConverter';
import { searchHistoryManager, SearchCategory as SearchCat } from '@/services/searchHistory';
import SearchHistoryItem from '@/components/SearchHistoryItem';
import SearchResultSkeleton from '@/components/skeleton/SearchResultSkeleton';
import FadeInView from '@/components/FadeInView';
import FadeInImage from '@/components/FadeInImage';
import { supabase } from '@/integrations/supabase/client';
import { isTraktHealthy } from '@/services/traktHealth';
import { getTrendingShows, getRecentlyReleasedShows, getPopularShowsByGenre, getRelatedShows, getPlayedShows, TraktPaginatedResponse, TraktPaginationInfo, getShowsByGenre } from '@/services/trakt';
import { getUserInterests, getAllGenres } from '@/services/userInterests';
import ExploreShowSection from '@/components/ExploreShowSection';
import { ScrollView as RNScrollView } from 'react-native';
import { getShowRecommendations, getSimilarShows } from '@/services/tmdb';
import { rankCandidates, applyHardFilters } from '@/services/recommendationScoring';
import { discoverShows, type TMDBDiscoverParams, type TMDBShow } from '@/services/tmdb';

type SearchCategory = 'shows' | 'users' | 'posts' | 'comments';

// TMDB Genre ID Mapping (Official TMDB TV genre IDs - verified 2025)
const TMDB_GENRE_IDS: { [key: string]: number } = {
  'action': 10759,       // Action & Adventure
  'adventure': 10759,    // Action & Adventure
  'animation': 16,       // Animation
  'anime': 16,           // Animation
  'comedy': 35,          // Comedy
  'crime': 80,           // Crime
  'documentary': 99,     // Documentary
  'drama': 18,           // Drama
  'family': 10751,       // Family
  'fantasy': 10765,      // Sci-Fi & Fantasy
  'kids': 10762,         // Kids
  'mystery': 9648,       // Mystery
  'news': 10763,         // News
  'reality': 10764,      // Reality
  'science-fiction': 10765, // Sci-Fi & Fantasy
  'soap': 10766,         // Soap
  'talk': 10767,         // Talk
  'war': 10768,          // War & Politics
  'western': 37,         // Western
  // Note: TMDB TV doesn't have separate Horror, Romance, History, Thriller, or Music genres
  // These will fall back to Drama/other genres + keyword filtering
  'music': 18,           // Drama (fallback - use keywords for music shows)
  'horror': 9648,        // Mystery (fallback - use keywords for horror shows)
  'thriller': 18,        // Drama (fallback - use keywords for thriller shows)
  'romance': 18,         // Drama (fallback - use keywords for romance shows)
  'history': 18,         // Drama (fallback - use keywords for history shows)
};

// Genre to emoji mapping
const getGenreEmoji = (genre: string): string => {
  const genreLower = genre.toLowerCase();
  const emojiMap: { [key: string]: string } = {
    'action': '💥',
    'adventure': '🗺️',
    'animation': '🎨',
    'anime': '🎌',
    'comedy': '😂',
    'crime': '🔫',
    'documentary': '🎥',
    'drama': '🎭',
    'family': '👨‍👩‍👧‍👦',
    'fantasy': '🧙',
    'history': '📜',
    'horror': '👻',
    'music': '🎵',
    'mystery': '🔍',
    'romance': '💕',
    'science-fiction': '🚀',
    'thriller': '😱',
    'war': '⚔️',
    'western': '🤠',
  };
  return emojiMap[genreLower] || '📺';
};

// Get section title
const getSectionTitle = (sectionKey: string, params?: any): string => {
  if (sectionKey === 'for-you') return 'For You';
  if (sectionKey === 'trending') return 'Trending';
  if (sectionKey === 'popular-rewatches') return 'Popular Rewatches';
  if (sectionKey === 'because-you-watched') {
    const seedShowTitle = params?.seedShowTitle;
    if (seedShowTitle) {
      // Note: useLocalSearchParams already decodes the value, no need to decode again
      return `Because You Watched ${seedShowTitle}`;
    }
    return 'Because You Watched';
  }
  return 'Section';
};

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { posts, playlists, isShowInPlaylist, followUser, unfollowUser, isFollowing, currentUser, ensureShowUuid } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const initialTab = (params.tab as SearchCategory) || 'shows';
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(initialTab);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  
  const [traktShowResults, setTraktShowResults] = useState<{ query: string; results: Array<{ show: Show; traktShow: TraktShow }> }>({ query: '', results: [] });
  const [isSearchingShows, setIsSearchingShows] = useState(false);
  const [showSearchError, setShowSearchError] = useState<string | null>(null);
  const [enrichingShows, setEnrichingShows] = useState<Set<number>>(new Set());
  const [isSavingShow, setIsSavingShow] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchQueryRef = useRef<string>('');
  const currentActiveCategoryRef = useRef<SearchCategory>(activeCategory);
  const searchRequestTokenRef = useRef<number>(0);

  const [searchHistory, setSearchHistory] = useState<{
    shows: string[];
    posts: string[];
    comments: string[];
    users: string[];
  }>({ shows: [], posts: [], comments: [], users: [] });

  // Curated content state
  const [forYouShows, setForYouShows] = useState<any[]>([]);
  const [trendingShows, setTrendingShows] = useState<any[]>([]);
  const [becauseYouWatchedSections, setBecauseYouWatchedSections] = useState<Array<{ show: any; relatedShows: any[] }>>([]);
  const [popularRewatchesShows, setPopularRewatchesShows] = useState<any[]>([]);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [isLoadingCurated, setIsLoadingCurated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Genre/Section detail view state
  const genreParam = params.genre as string | undefined;
  const sectionParam = params.section as string | undefined;
  const [genreShows, setGenreShows] = useState<any[]>([]);
  const [isLoadingGenre, setIsLoadingGenre] = useState(false);
  const [genrePage, setGenrePage] = useState(1);
  const [hasMoreGenreShows, setHasMoreGenreShows] = useState(true);
  const [lastSuccessfulGenrePage, setLastSuccessfulGenrePage] = useState(0);
  const [sectionShows, setSectionShows] = useState<any[]>([]);
  const [isLoadingSection, setIsLoadingSection] = useState(false);
  const [sectionPage, setSectionPage] = useState(1);
  const [sectionPageCount, setSectionPageCount] = useState<number | null>(null);
  const [hasMoreSectionShows, setHasMoreSectionShows] = useState(true);
  const [lastSuccessfulSectionPage, setLastSuccessfulSectionPage] = useState(0);

  const preselectedShowId = params.showId as string | undefined;
  const [showFilter, setShowFilter] = useState<string | undefined>(preselectedShowId);
  const preselectedShow = useMemo(() => {
    if (!showFilter) return null;
    const traktShow = traktShowResults.results.find(r => r.show.id === showFilter);
    return traktShow ? traktShow.show : mockShows.find(s => s.id === showFilter);
  }, [showFilter, traktShowResults]);

  const handleTabChange = (tabKey: string) => {
    const newCategory = tabKey as SearchCategory;
    currentActiveCategoryRef.current = newCategory;
    setActiveCategory(newCategory);
    
    if (newCategory !== 'shows') {
      searchRequestTokenRef.current++;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      setIsSearchingShows(false);
    }
  };

  useEffect(() => {
    const loadSearchHistory = async () => {
      const history = await searchHistoryManager.getHistory(activeCategory as SearchCat);
      setSearchHistory(prev => ({
        ...prev,
        [activeCategory]: history
      }));
    };
    
    loadSearchHistory();
  }, [activeCategory]);

  const addSearchToHistory = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    await searchHistoryManager.addToHistory(activeCategory as SearchCat, trimmedQuery);
    
    const updatedHistory = await searchHistoryManager.getHistory(activeCategory as SearchCat);
    setSearchHistory(prev => ({
      ...prev,
      [activeCategory]: updatedHistory
    }));
  };

  const removeFromSearchHistory = async (query: string) => {
    await searchHistoryManager.removeFromHistory(activeCategory as SearchCat, query);
    
    const updatedHistory = await searchHistoryManager.getHistory(activeCategory as SearchCat);
    setSearchHistory(prev => ({
      ...prev,
      [activeCategory]: updatedHistory
    }));
  };

  const handleHistoryItemPress = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchSubmit = () => {
    if (activeCategory === 'shows' || !searchQuery.trim()) {
      return;
    }
    
    const trimmedQuery = searchQuery.trim();
    const currentHistory = searchHistory[activeCategory];
    
    if (currentHistory.length > 0 && currentHistory[0].toLowerCase() === trimmedQuery.toLowerCase()) {
      return;
    }
    
    addSearchToHistory(trimmedQuery);
  };

  // Load curated content when search is empty
  useEffect(() => {
    if (searchQuery.trim().length > 0 || !currentUser?.id) return;
    
    const loadCuratedContent = async () => {
      setIsLoadingCurated(true);
      
      try {
        // Get user interests
        const interests = await getUserInterests(currentUser.id);
        setUserGenres(interests.genres);
        
        // Get all available genres for grid display
        const genresList = getAllGenres();
        setAllGenres(genresList);
        
        // 1. For You - Mix friends' currently watching + trending recommendations, sorted by rating
        const followingIds = currentUser.following || [];
        const friendsPosts = posts.filter(post => 
          followingIds.includes(post.user.id) && post.show
        );
        
        const showFriendCounts = new Map();
        friendsPosts.forEach(post => {
          const traktId = post.show.traktId;
          if (!traktId) return;
          
          const existing = showFriendCounts.get(traktId);
          if (existing) {
            existing.friendIds.add(post.user.id);
            existing.friendCount = existing.friendIds.size;
          } else {
            showFriendCounts.set(traktId, {
              show: post.show,
              friendCount: 1,
              friendIds: new Set([post.user.id])
            });
          }
        });
        
        const friendShows = Array.from(showFriendCounts.values())
          .sort((a, b) => b.friendCount - a.friendCount)
          .map(item => ({
            ...item.show,
            id: item.show.id || `trakt-${item.show.traktId}`,
            rating: item.show.rating || 0
          }))
          .slice(0, 6);
        
        // Get trending shows for mix
        const { data: trending } = await getTrendingShows(12);
        const enrichedTrendingForYou = await Promise.all(
          trending.map(async (traktShow) => {
            const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
            const show = mapTraktShowToShow(traktShow, {
              posterUrl: enrichedData.posterUrl,
              totalSeasons: enrichedData.totalSeasons,
            });
            return {
              ...show,
              id: show.id || `trakt-${traktShow.ids.trakt}`,
              traktId: traktShow.ids.trakt,
              rating: traktShow.rating || 0,
              traktShow
            };
          })
        );
        
        // Mix and sort by rating
        const mixedForYou = [...friendShows, ...enrichedTrendingForYou]
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 12);
        
        setForYouShows(mixedForYou);
        
        // 2. Trending
        const enrichedTrending = await Promise.all(
          trending.map(async (traktShow) => {
            const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
            const show = mapTraktShowToShow(traktShow, {
              posterUrl: enrichedData.posterUrl,
              totalSeasons: enrichedData.totalSeasons,
            });
            return {
              ...show,
              id: show.id || `trakt-${traktShow.ids.trakt}`,
              traktId: traktShow.ids.trakt,
              traktShow
            };
          })
        );
        setTrendingShows(enrichedTrending);
        
        // 3-5. Because You Watched - Get user's 3 most recently logged shows
        const userPosts = posts
          .filter(post => post.user.id === currentUser.id && post.show?.traktId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Track most recent post timestamp for each show to ensure deterministic ordering
        const showLastWatchedMap = new Map<number, { show: any; lastWatchedAt: string }>();
        userPosts.forEach(post => {
          const traktId = post.show.traktId;
          if (!showLastWatchedMap.has(traktId)) {
            showLastWatchedMap.set(traktId, {
              show: post.show,
              lastWatchedAt: post.createdAt
            });
          }
        });
        
        // Sort by most recent watch (post createdAt), then slice to get 3 most recent shows
        const recentShows = Array.from(showLastWatchedMap.values())
          .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
          .slice(0, 3)
          .map(item => item.show);
        
        const becauseYouWatchedPromises = recentShows.map(async (show) => {
          try {
            console.log(`🎯 Fetching recommendations for "${show.title}"...`);
            
            // Step 0: Fetch seed show from Trakt to get fresh genres/year data (bypasses PostgREST cache)
            const seedTraktShow = await (async () => {
              try {
                const { getShowDetails } = await import('@/services/trakt');
                return await getShowDetails(show.traktId);
              } catch (error) {
                console.warn(`  ⚠️ Failed to fetch seed show from Trakt, using database version:`, error);
                return mapDatabaseShowToTraktShow(show);
              }
            })();
            
            // Step 1: Gather candidates from multiple sources (target: ≥60 raw candidates)
            const candidatesMap = new Map<number, TraktShow>();
            
            // Source 1: Trakt related shows (collaborative filtering) - fetch multiple batches if needed
            try {
              let relatedShows = await getRelatedShows(show.traktId, 100);
              relatedShows.forEach(ts => candidatesMap.set(ts.ids.trakt, ts));
              console.log(`  ✓ Trakt related: ${relatedShows.length} shows`);
              
              // If Trakt returned <60 candidates, blend in popular shows from seed's genres as fallback
              if (relatedShows.length < 60 && seedTraktShow.genres && seedTraktShow.genres.length > 0) {
                console.log(`  ⚡ Expanding pool with popular ${seedTraktShow.genres[0]} shows (got ${relatedShows.length}, target 60+)...`);
                const { getPopularShowsByGenre } = await import('@/services/trakt');
                const popularInGenre = await getPopularShowsByGenre(seedTraktShow.genres[0].toLowerCase(), 50);
                popularInGenre.forEach(ts => candidatesMap.set(ts.ids.trakt, ts));
                console.log(`  ✓ Added ${popularInGenre.length} popular shows, total pool: ${candidatesMap.size}`);
              }
            } catch (error) {
              console.warn(`  ⚠️ Trakt related failed:`, error);
            }
            
            // Get seed show enrichment data for scoring
            const seedEnrichment = await showEnrichmentManager.enrichShow(seedTraktShow);
            
            // TODO: Add TMDB recommendations/similar shows later after implementing efficient TMDB→Trakt mapping
            // For now, using Trakt related shows only (collaborative filtering)
            
            const candidates = Array.from(candidatesMap.values());
            console.log(`  📊 Total candidates: ${candidates.length}`);
            
            // Step 1.5: Apply hard filters (genre + year + animation + language + rating)
            let filteredCandidates = applyHardFilters(seedTraktShow, candidates);
            
            console.log(`  🎯 Strict filtered: ${filteredCandidates.length}/${candidates.length} candidates`);
            
            // Step 1.6: Progressive relaxation - if <20 survivors, apply relaxed filters
            if (filteredCandidates.length < 20) {
              const { applyRelaxedFilters } = await import('@/services/recommendationScoring');
              const relaxedCandidates = applyRelaxedFilters(seedTraktShow, candidates, filteredCandidates);
              console.log(`  ⚡ Applied relaxed filters (+${relaxedCandidates.length} more) → Total: ${filteredCandidates.length + relaxedCandidates.length}`);
              filteredCandidates = [...filteredCandidates, ...relaxedCandidates];
            }
            
            if (filteredCandidates.length < candidates.length) {
              const filtered = candidates.filter(c => !filteredCandidates.includes(c));
              const animated = filtered.filter(c => c.genres?.some(g => g.toLowerCase() === 'animation' || g.toLowerCase() === 'anime'));
              const foreign = filtered.filter(c => c.language && c.language !== 'en' && !['us', 'gb', 'ca', 'au'].includes(c.country?.toLowerCase() || ''));
              const lowRated = filtered.filter(c => c.rating && c.rating < 6.5);
              
              console.log(`  ❌ Filtered out: ${filtered.length} shows`);
              if (animated.length > 0) console.log(`    - Animation/Anime: ${animated.slice(0, 3).map(c => c.title).join(', ')}`);
              if (foreign.length > 0) console.log(`    - Foreign: ${foreign.slice(0, 3).map(c => `${c.title} (${c.language})`).join(', ')}`);
              if (lowRated.length > 0) console.log(`    - Low-rated (<6.5): ${lowRated.slice(0, 3).map(c => `${c.title} (${c.rating})`).join(', ')}`);
            }
            
            // Step 2: Enrich filtered candidates (needed for keyword-based scoring)
            const enrichedCandidates = await Promise.all(
              filteredCandidates.map(async (traktShow) => {
                const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
                return {
                  show: mapTraktShowToShow(traktShow, {
                    posterUrl: enrichedData.posterUrl,
                    totalSeasons: enrichedData.totalSeasons,
                  }),
                  traktShow,
                  enrichedData
                };
              })
            );
            
            // Step 3: Apply similarity scoring and rank
            const seedShow = {
              traktShow: seedTraktShow, // Use fresh Trakt data with genres/year, not stale database version
              enrichedData: seedEnrichment
            };
            
            // Debug: Log seed show enrichment data
            console.log(`  🔍 Seed enrichment: TMDB ID=${seedEnrichment.tmdbId}, keywords=${seedEnrichment.keywords?.length || 0}`);
            
            const ranked = rankCandidates(seedShow, enrichedCandidates, 15); // Min score: 15 (lowered for better results)
            console.log(`  ⭐ High-quality matches: ${ranked.length} (min score 15)`);
            if (ranked.length > 0) {
              console.log(`  📈 Top scores: ${ranked.slice(0, 3).map(r => `${r.traktShow.title} (${r.score})`).join(', ')}`);
            }
            if (ranked.length === 0 && enrichedCandidates.length > 0) {
              // Debug: Show what scores we're actually getting
              const allScores = enrichedCandidates.slice(0, 5).map(c => {
                const { scoreShowSimilarity } = require('@/services/recommendationScoring');
                return { title: c.traktShow.title, score: scoreShowSimilarity(seedShow, c) };
              });
              console.log(`  ⚠️ All candidates scored too low. Sample scores:`, allScores);
            }
            
            // Step 4: Take ALL ranked recommendations (no limit)
            const topRecommendations = ranked.map(item => ({
              ...item.show,
              id: item.show.id || `trakt-${item.traktShow.ids.trakt}`,
              traktId: item.traktShow.ids.trakt,
              traktShow: item.traktShow
            }));
            
            return {
              show,
              relatedShows: topRecommendations
            };
          } catch (error) {
            console.error(`❌ Error fetching recommendations for ${show.title}:`, error);
            return { show, relatedShows: [] };
          }
        });
        
        const becauseYouWatched = await Promise.all(becauseYouWatchedPromises);
        // Show rows with 3+ recommendations (lowered threshold)
        setBecauseYouWatchedSections(becauseYouWatched.filter(section => section.relatedShows.length >= 3));
        
        // 6. Popular Rewatches
        const { data: playedShows } = await getPlayedShows('monthly', 12);
        const enrichedPlayed = await Promise.all(
          playedShows.map(async (traktShow) => {
            const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
            const show = mapTraktShowToShow(traktShow, {
              posterUrl: enrichedData.posterUrl,
              totalSeasons: enrichedData.totalSeasons,
            });
            return {
              ...show,
              id: show.id || `trakt-${traktShow.ids.trakt}`,
              traktId: traktShow.ids.trakt,
              traktShow
            };
          })
        );
        setPopularRewatchesShows(enrichedPlayed);
        
      } catch (error) {
        console.error('Error loading curated content:', error);
      } finally {
        setIsLoadingCurated(false);
      }
    };
    
    loadCuratedContent();
  }, [searchQuery, currentUser, posts]);

  const handleRefresh = useCallback(async () => {
    // Don't refresh while searching or without a user
    if (searchQuery.trim().length > 0 || !currentUser?.id || isLoadingCurated) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setRefreshing(true);
    try {
      // Reload trending shows only (fast refresh)
      const { data: trending } = await getTrendingShows(12);
      const enrichedTrending = await Promise.all(
        trending.map(async (traktShow) => {
          const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
          const show = mapTraktShowToShow(traktShow, {
            posterUrl: enrichedData.posterUrl,
            totalSeasons: enrichedData.totalSeasons,
          });
          return {
            ...show,
            id: show.id || `trakt-${traktShow.ids.trakt}`,
            traktId: traktShow.ids.trakt,
            traktShow
          };
        })
      );
      setTrendingShows(enrichedTrending);
      
      // Reload popular rewatches
      const { data: playedShows } = await getPlayedShows('monthly', 12);
      const enrichedPlayed = await Promise.all(
        playedShows.map(async (traktShow) => {
          const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
          const show = mapTraktShowToShow(traktShow, {
            posterUrl: enrichedData.posterUrl,
            totalSeasons: enrichedData.totalSeasons,
          });
          return {
            ...show,
            id: show.id || `trakt-${traktShow.ids.trakt}`,
            traktId: traktShow.ids.trakt,
            traktShow
          };
        })
      );
      setPopularRewatchesShows(enrichedPlayed);
      
    } catch (error) {
      console.error('Error refreshing explore page:', error);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, currentUser, posts]);

  // Silent auto-refresh when page comes into focus (no spinner)
  useFocusEffect(
    useCallback(() => {
      const silentRefresh = async () => {
        // Only refresh curated content when not searching
        if (searchQuery.trim().length > 0 || !currentUser?.id || isLoadingCurated) return;
        
        try {
          // Silent reload without haptic or spinner - just update For You with friend data
          const followingIds = currentUser.following || [];
          const friendsPosts = posts.filter(post => 
            followingIds.includes(post.user.id) && post.show
          );
          
          const showFriendCounts = new Map();
          friendsPosts.forEach(post => {
            const traktId = post.show.traktId;
            if (!traktId) return;
            
            const existing = showFriendCounts.get(traktId);
            if (existing) {
              existing.friendIds.add(post.user.id);
              existing.friendCount = existing.friendIds.size;
            } else {
              showFriendCounts.set(traktId, {
                show: post.show,
                friendCount: 1,
                friendIds: new Set([post.user.id])
              });
            }
          });
          
          const friendShows = Array.from(showFriendCounts.values())
            .sort((a, b) => b.friendCount - a.friendCount)
            .map(item => ({
              ...item.show,
              id: item.show.id || `trakt-${item.show.traktId}`,
              rating: item.show.rating || 0
            }))
            .slice(0, 6);
          
          // Update For You by mixing with current trending shows (if available)
          if (forYouShows.length > 0) {
            const mixedForYou = [...friendShows, ...forYouShows.slice(6)]
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 12);
            setForYouShows(mixedForYou);
          }
        } catch (error) {
          console.error('Error auto-refreshing explore page:', error);
        }
      };
      
      silentRefresh();
    }, [searchQuery, currentUser, posts, forYouShows])
  );

  // Load genre detail view with pagination
  useEffect(() => {
    if (!genreParam) {
      setGenreShows([]);
      setGenrePage(1);
      setHasMoreGenreShows(true);
      setLastSuccessfulGenrePage(0);
      return;
    }

    // Reset when genre changes
    setGenreShows([]);
    setGenrePage(2); // Start at page 2 since we're loading 2 pages initially
    setHasMoreGenreShows(true);
    setLastSuccessfulGenrePage(0);
    
    const loadGenreShows = async () => {
      setIsLoadingGenre(true);
      try {
        const genreSlug = genreParam.toLowerCase();
        
        // Fetch first 2 pages from Trakt to ensure we have 30+ shows
        const [page1Response, page2Response] = await Promise.all([
          getShowsByGenre(genreSlug, { page: 1, limit: 20 }),
          getShowsByGenre(genreSlug, { page: 2, limit: 20 })
        ]);
        
        const allShows = [...page1Response.shows, ...page2Response.shows];
        
        // Check if we have more shows - only trust pagination headers
        if (page2Response.pagination.pageCount !== null && page2Response.pagination.page >= page2Response.pagination.pageCount) {
          setHasMoreGenreShows(false);
        }
        // Otherwise keep pagination alive (defensive - don't assume <20 shows means end)
        
        // Enrich with posters
        const enrichedShows = await Promise.all(
          allShows.map(async (traktShow) => {
            try {
              const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
              return {
                ...mapTraktShowToShow(traktShow, {
                  posterUrl: enrichedData.posterUrl,
                  totalSeasons: enrichedData.totalSeasons,
                }),
                id: `trakt-${traktShow.ids.trakt}`,
                traktId: traktShow.ids.trakt,
                traktShow,
              };
            } catch (error) {
              console.error(`Error enriching ${traktShow.title}:`, error);
              return null;
            }
          })
        );

        const validShows = enrichedShows.filter(show => show !== null);
        setGenreShows(validShows);
        setGenrePage(2); // Set to page 2 since we loaded pages 1-2
        setLastSuccessfulGenrePage(2); // Track initial successful load (loaded pages 1-2)
      } catch (error) {
        console.error('Error loading genre shows:', error);
      } finally {
        setIsLoadingGenre(false);
      }
    };

    loadGenreShows();
  }, [genreParam]);

  // Load section detail view (fetch 30 shows for full results)
  useEffect(() => {
    if (!sectionParam) {
      setSectionShows([]);
      setSectionPage(1);
      setSectionPageCount(null);
      setHasMoreSectionShows(true);
      setLastSuccessfulSectionPage(0);
      return;
    }

    // Reset pagination state when section changes
    setSectionShows([]);
    setSectionPage(1);
    setSectionPageCount(null); // null = unknown, not yet fetched
    setHasMoreSectionShows(true);
    setLastSuccessfulSectionPage(0);

    const loadSectionShows = async () => {
      setIsLoadingSection(true);
      try {
        let shows: any[] = [];
        
        if (sectionParam === 'for-you') {
          // For You = friend activity + trending (sorted by rating)
          const { data: trending, pagination } = await getTrendingShows(30, 1);
          if (pagination && pagination.pageCount) {
            setSectionPageCount(pagination.pageCount);
          }
          const enrichedTrending = await Promise.all(
            trending.map(async (traktShow) => {
              const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
              const show = mapTraktShowToShow(traktShow, {
                posterUrl: enrichedData.posterUrl,
                totalSeasons: enrichedData.totalSeasons,
              });
              return {
                ...show,
                id: show.id || `trakt-${traktShow.ids.trakt}`,
                rating: show.rating || 0,
                traktId: traktShow.ids.trakt,
                traktShow
              };
            })
          );
          shows = enrichedTrending.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sectionParam === 'trending') {
          const { data: trending, pagination } = await getTrendingShows(30, 1);
          if (pagination && pagination.pageCount) {
            setSectionPageCount(pagination.pageCount);
          }
          shows = await Promise.all(
            trending.map(async (traktShow) => {
              const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
              const show = mapTraktShowToShow(traktShow, {
                posterUrl: enrichedData.posterUrl,
                totalSeasons: enrichedData.totalSeasons,
              });
              return {
                ...show,
                id: show.id || `trakt-${traktShow.ids.trakt}`,
                traktId: traktShow.ids.trakt,
                traktShow
              };
            })
          );
        } else if (sectionParam === 'popular-rewatches') {
          const { data: playedShows, pagination } = await getPlayedShows('monthly', 30, 1);
          if (pagination && pagination.pageCount) {
            setSectionPageCount(pagination.pageCount);
          }
          shows = await Promise.all(
            playedShows.map(async (traktShow) => {
              const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
              const show = mapTraktShowToShow(traktShow, {
                posterUrl: enrichedData.posterUrl,
                totalSeasons: enrichedData.totalSeasons,
              });
              return {
                ...show,
                id: show.id || `trakt-${traktShow.ids.trakt}`,
                traktId: traktShow.ids.trakt,
                traktShow
              };
            })
          );
        } else if (sectionParam === 'because-you-watched') {
          // Fetch ALL recommendations with proper filtering (no pagination - loads everything upfront)
          // Note: useLocalSearchParams already decodes values, don't decode again to avoid crashes
          const seedShowTraktId = parseInt(params.seedShowTraktId as string);
          const seedShowTitle = params.seedShowTitle as string || '';
          const seedShowYear = parseInt(params.seedShowYear as string) || undefined;
          const seedShowRating = parseFloat(params.seedShowRating as string) || undefined;
          const seedShowGenres = params.seedShowGenres 
            ? JSON.parse(params.seedShowGenres as string)
            : [];
          
          if (seedShowTraktId && seedShowTitle) {
            console.log(`🎯 Fetching full recommendations for "${seedShowTitle}" (${seedShowYear || 'unknown year'})...`);
            console.log(`  Seed genres: ${seedShowGenres.join(', ') || 'none'}`);
            
            // Fetch seed show from Trakt to get fresh data
            const { getShowDetails } = await import('@/services/trakt');
            const seedTraktShow = await getShowDetails(seedShowTraktId);
            
            // Step 1: Gather candidates from multiple sources (target: ≥60 raw candidates)
            const candidatesMap = new Map<number, any>();
            
            try {
              let relatedShows = await getRelatedShows(seedShowTraktId, 100);
              relatedShows.forEach(ts => candidatesMap.set(ts.ids.trakt, ts));
              console.log(`  ✓ Trakt related: ${relatedShows.length} shows`);
              
              // If Trakt returned <60 candidates, blend in popular shows from seed's genres as fallback
              if (relatedShows.length < 60 && seedTraktShow.genres && seedTraktShow.genres.length > 0) {
                console.log(`  ⚡ Expanding pool with popular ${seedTraktShow.genres[0]} shows (got ${relatedShows.length}, target 60+)...`);
                const { getPopularShowsByGenre } = await import('@/services/trakt');
                const popularInGenre = await getPopularShowsByGenre(seedTraktShow.genres[0].toLowerCase(), 50);
                popularInGenre.forEach(ts => candidatesMap.set(ts.ids.trakt, ts));
                console.log(`  ✓ Added ${popularInGenre.length} popular shows, total pool: ${candidatesMap.size}`);
              }
            } catch (error) {
              console.error('  ⚠️ Error fetching related shows:', error);
            }
            
            const candidates = Array.from(candidatesMap.values());
            console.log(`  📊 Total candidates: ${candidates.length}`);
            
            // Step 2: Apply hard filters (genre + year + animation + language + rating)
            let filteredCandidates = applyHardFilters(seedTraktShow, candidates);
            
            console.log(`  🎯 Strict filtered: ${filteredCandidates.length}/${candidates.length} candidates`);
            
            // Step 2.5: Progressive relaxation - if <20 survivors, apply relaxed filters
            if (filteredCandidates.length < 20) {
              const { applyRelaxedFilters } = await import('@/services/recommendationScoring');
              const relaxedCandidates = applyRelaxedFilters(seedTraktShow, candidates, filteredCandidates);
              console.log(`  ⚡ Applied relaxed filters (+${relaxedCandidates.length} more) → Total: ${filteredCandidates.length + relaxedCandidates.length}`);
              filteredCandidates = [...filteredCandidates, ...relaxedCandidates];
            }
            
            if (filteredCandidates.length < candidates.length) {
              const filtered = candidates.filter(c => !filteredCandidates.includes(c));
              const animated = filtered.filter(c => c.genres?.some(g => g.toLowerCase() === 'animation' || g.toLowerCase() === 'anime'));
              const foreign = filtered.filter(c => c.language && c.language !== 'en' && !['us', 'gb', 'ca', 'au'].includes(c.country?.toLowerCase() || ''));
              const lowRated = filtered.filter(c => c.rating && c.rating < 6.5);
              
              console.log(`  ❌ Filtered out: ${filtered.length} shows`);
              if (animated.length > 0) console.log(`    - Animation/Anime: ${animated.slice(0, 3).map(c => c.title).join(', ')}`);
              if (foreign.length > 0) console.log(`    - Foreign: ${foreign.slice(0, 3).map(c => `${c.title} (${c.language})`).join(', ')}`);
              if (lowRated.length > 0) console.log(`    - Low-rated (<6.5): ${lowRated.slice(0, 3).map(c => `${c.title} (${c.rating})`).join(', ')}`);
            }
            
            // Step 3: Enrich candidates with posters
            const enrichedCandidates = await Promise.all(
              filteredCandidates.map(async (traktShow) => {
                const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
                return {
                  show: mapTraktShowToShow(traktShow, {
                    posterUrl: enrichedData.posterUrl,
                    totalSeasons: enrichedData.totalSeasons,
                  }),
                  traktShow,
                  enrichedData,
                };
              })
            );
            
            // Step 4: Get seed enrichment and apply similarity scoring
            const seedEnrichment = await showEnrichmentManager.enrichShow(seedTraktShow);
            const seedShow = {
              traktShow: seedTraktShow,
              enrichedData: seedEnrichment,
            };
            
            const rankedShows = rankCandidates(seedShow, enrichedCandidates, 15);
            console.log(`  ⭐ High-quality matches: ${rankedShows.length} (min score 15)`);
            
            shows = rankedShows.map(scored => ({
              ...scored.show,
              id: scored.show.id || `trakt-${scored.traktShow.ids.trakt}`,
              traktId: scored.traktShow.ids.trakt,
              traktShow: scored.traktShow,
              score: scored.score,
            }));
            
            // Disable pagination for "because-you-watched" since we load all results upfront
            setHasMoreSectionShows(false);
          }
        }
        
        setSectionShows(shows);
        setLastSuccessfulSectionPage(1); // Track initial successful load
      } catch (error) {
        console.error('Error loading section shows:', error);
      } finally {
        setIsLoadingSection(false);
      }
    };

    loadSectionShows();
  }, [sectionParam]);

  // Load more section shows with retry logic for production reliability
  const loadMoreSectionShows = useCallback(async () => {
    if (!sectionParam || isLoadingSection || !hasMoreSectionShows) return;
    
    // "because-you-watched" loads all results upfront, no pagination
    if (sectionParam === 'because-you-watched') {
      setHasMoreSectionShows(false);
      return;
    }

    const nextPage = sectionPage + 1;
    
    // Only check page count if we have valid pagination headers (null = unknown/not fetched yet)
    if (sectionPageCount !== null && nextPage > sectionPageCount) {
      setHasMoreSectionShows(false);
      return;
    }

    setIsLoadingSection(true);

    // Retry logic: max 2 retries with exponential backoff (250ms, 750ms)
    let retryAttempt = 0;
    const maxRetries = 2;
    const delays = [250, 750];

    while (retryAttempt <= maxRetries) {
      try {
        let traktShows: any[] = [];
        let pagination: TraktPaginationInfo | null = null;
        
        if (sectionParam === 'for-you' || sectionParam === 'trending') {
          const response = await getTrendingShows(30, nextPage);
          traktShows = response.data;
          pagination = response.pagination;
        } else if (sectionParam === 'popular-rewatches') {
          const response = await getPlayedShows('monthly', 30, nextPage);
          traktShows = response.data;
          pagination = response.pagination;
        }
        
        // Update page count from headers (may change dynamically)
        if (pagination && pagination.pageCount) {
          setSectionPageCount(pagination.pageCount);
        }
        
        // Handle empty responses
        if (traktShows.length === 0) {
          if (pagination && pagination.pageCount && nextPage >= pagination.pageCount) {
            // Pagination confirms we're at the end
            setHasMoreSectionShows(false);
            setIsLoadingSection(false);
            return;
          } else if (pagination && pagination.pageCount) {
            // Have headers but empty response and more pages exist - retry (could be rate limit)
            if (retryAttempt < maxRetries) {
              console.warn(`Empty response on page ${nextPage}, retrying (${retryAttempt + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delays[retryAttempt]));
              retryAttempt++;
              continue;
            } else {
              // Exhausted retries - likely rate limiting, keep pagination alive for manual retry
              console.warn('⚠️ Trakt API rate limit detected - keeping pagination alive for retry');
              Alert.alert(
                'Slow Down There!',
                'Episoda needs a quick breather. Scroll again in a moment to load more shows.',
                [{ text: 'Got It', style: 'default' }]
              );
              setIsLoadingSection(false);
              // Keep hasMore=true so user can retry later
              return;
            }
          } else {
            // No pagination headers - could be transient failure or end of data
            if (retryAttempt < maxRetries) {
              console.warn(`No pagination headers, retrying (${retryAttempt + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delays[retryAttempt]));
              retryAttempt++;
              continue;
            } else {
              // After retries, treat as transient failure and keep pagination alive
              console.warn('⚠️ Empty response without headers after retries - keeping pagination alive');
              Alert.alert(
                'Connection Issue',
                'Having trouble loading more shows. Scroll again to retry.',
                [{ text: 'OK', style: 'default' }]
              );
              setIsLoadingSection(false);
              // Keep hasMore=true for manual retry
              return;
            }
          }
        }
        
        // Success! Enrich shows
        const newShows = await Promise.all(
          traktShows.map(async (traktShow) => {
            const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
            const show = mapTraktShowToShow(traktShow, {
              posterUrl: enrichedData.posterUrl,
              totalSeasons: enrichedData.totalSeasons,
            });
            return {
              ...show,
              id: show.id || `trakt-${traktShow.ids.trakt}`,
              traktId: traktShow.ids.trakt,
              traktShow
            };
          })
        );
        
        // Only increment page and append data after successful fetch and enrichment
        setSectionShows(prev => [...prev, ...newShows]);
        setSectionPage(nextPage); // Only incremented on success
        setLastSuccessfulSectionPage(nextPage); // Track last successful fetch
        
        // Use pagination headers to determine if more data is available
        if (pagination && pagination.pageCount && nextPage >= pagination.pageCount) {
          setHasMoreSectionShows(false);
        }
        
        // Success - break retry loop
        break;
        
      } catch (error) {
        console.error(`Error loading section shows (attempt ${retryAttempt + 1}/${maxRetries + 1}):`, error);
        
        if (retryAttempt < maxRetries) {
          // Retry on error
          await new Promise(resolve => setTimeout(resolve, delays[retryAttempt]));
          retryAttempt++;
        } else {
          // Exhausted retries - keep pagination alive for manual retry
          console.warn('⚠️ Error loading shows after retries - keeping pagination alive');
          Alert.alert(
            'Network Error',
            'Could not load more shows. Check your connection and scroll again to retry.',
            [{ text: 'OK', style: 'default' }]
          );
          // Keep hasMore=true so user can retry later
          break;
        }
      }
    }

    setIsLoadingSection(false);
  }, [sectionParam, sectionPage, sectionPageCount, isLoadingSection, hasMoreSectionShows]);

  // Load more genre shows (pagination - starts from page 3 since initial load gets pages 1-2)
  const loadMoreGenreShows = useCallback(async () => {
    if (!genreParam || isLoadingGenre || !hasMoreGenreShows) return;

    const nextPage = genrePage + 1;
    setIsLoadingGenre(true);

    // Retry logic: max 2 retries with exponential backoff
    let retryAttempt = 0;
    const maxRetries = 2;
    const delays = [250, 750];

    while (retryAttempt <= maxRetries) {
      try {
        const genreSlug = genreParam.toLowerCase();
        const response = await getShowsByGenre(genreSlug, { page: nextPage, limit: 20 });
        
        // Handle empty responses
        if (response.shows.length === 0) {
          if (retryAttempt < maxRetries) {
            console.warn(`Empty Trakt response for ${genreSlug} on page ${nextPage}, retrying (${retryAttempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delays[retryAttempt]));
            retryAttempt++;
            continue;
          } else {
            // After retries, check if we have pagination info to determine if this is truly the end
            const isDefinitelyEnd = response.pagination.pageCount !== null && nextPage >= response.pagination.pageCount;
            
            if (isDefinitelyEnd) {
              // Reached end of results based on pagination headers
              console.log(`✅ Reached end of ${genreSlug} shows`);
              setHasMoreGenreShows(false);
            } else {
              // Empty response after retries, but we don't know if it's the end
              // Keep pagination alive for manual retry
              console.warn('⚠️ Episoda empty response after retries - keeping pagination alive');
              Alert.alert(
                'No More Shows',
                'Could not load more shows. Scroll again to retry or try a different genre.',
                [{ text: 'OK', style: 'default' }]
              );
              // Keep hasMore=true so user can retry later
            }
            setIsLoadingGenre(false);
            return;
          }
        }
        
        // Check if we have more shows - only trust pagination headers
        if (response.pagination.pageCount !== null && response.pagination.page >= response.pagination.pageCount) {
          setHasMoreGenreShows(false);
        }
        // Otherwise keep pagination alive (defensive - don't assume <20 shows means end)

        const enrichedShows = await Promise.all(
          response.shows.map(async (traktShow) => {
            try {
              const enrichedData = await showEnrichmentManager.enrichShow(traktShow);
              return {
                ...mapTraktShowToShow(traktShow, {
                  posterUrl: enrichedData.posterUrl,
                  totalSeasons: enrichedData.totalSeasons,
                }),
                id: `trakt-${traktShow.ids.trakt}`,
                traktId: traktShow.ids.trakt,
                traktShow,
              };
            } catch (error) {
              console.error(`Error enriching ${traktShow.title}:`, error);
              return null;
            }
          })
        );

        const validShows = enrichedShows.filter(show => show !== null);
        if (validShows.length > 0) {
          setGenreShows(prev => [...prev, ...validShows]);
        }
        setGenrePage(nextPage);
        setLastSuccessfulGenrePage(nextPage); // Track last successful fetch
        
        // Success - break retry loop
        break;
        
      } catch (error) {
        console.error(`Error loading more genre shows (attempt ${retryAttempt + 1}/${maxRetries + 1}):`, error);
        
        if (retryAttempt < maxRetries) {
          // Retry on error
          await new Promise(resolve => setTimeout(resolve, delays[retryAttempt]));
          retryAttempt++;
        } else {
          // Exhausted retries - keep pagination alive for manual retry
          console.warn('⚠️ Error loading genre shows after retries - keeping pagination alive');
          Alert.alert(
            'Network Error',
            'Could not load more shows. Check your connection and scroll again to retry.',
            [{ text: 'OK', style: 'default' }]
          );
          // Keep hasMore=true so user can retry later
          break;
        }
      }
    }

    setIsLoadingGenre(false);
  }, [genreParam, genrePage, isLoadingGenre, hasMoreGenreShows]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (activeCategory !== 'shows') {
      return;
    }

    const trimmedQuery = searchQuery.trim();
    
    if (trimmedQuery.length === 0) {
      currentSearchQueryRef.current = '';
      searchRequestTokenRef.current++;
      setTraktShowResults({ query: '', results: [] });
      setIsSearchingShows(false);
      setShowSearchError(null);
      return;
    }

    currentSearchQueryRef.current = trimmedQuery;
    searchRequestTokenRef.current++;
    const requestToken = searchRequestTokenRef.current;
    setIsSearchingShows(true);
    setShowSearchError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Check Trakt health FIRST to avoid slow timeouts
        const traktHealthy = await isTraktHealthy();
        let response;
        
        if (!traktHealthy) {
          // Skip Trakt entirely - go straight to database
          console.log('⚠️ Trakt API down - using database-only search');
          const { data: dbShows, error: dbError } = await supabase
            .from('shows')
            .select('*')
            .ilike('title', `%${trimmedQuery}%`)
            .limit(20);
          
          if (dbError || !dbShows || dbShows.length === 0) {
            setShowSearchError(dbError ? 'Database error occurred' : 'No shows found in database');
            setIsSearchingShows(false);
            setTraktShowResults({ query: trimmedQuery.toLowerCase(), results: [] });
            return;
          }
          
          console.log(`📦 Found ${dbShows.length} shows from database (Trakt unavailable)`);
          const mappedShows = dbShows.map(dbShow => ({
            show: mapDatabaseShowToShow(dbShow),
            traktShow: mapDatabaseShowToTraktShow(dbShow)
          }));
          
          setTraktShowResults({ query: trimmedQuery.toLowerCase(), results: mappedShows });
          setCurrentPage(1);
          setTotalPages(1);
          setHasMore(false);
          setIsSearchingShows(false);
          addSearchToHistory(trimmedQuery);
          return;
        }
        
        // Try Trakt API (only if healthy)
        console.log(`🔍 Searching Trakt for: "${trimmedQuery}" (page 1, limit 20)`);
        try {
          response = await searchShows(trimmedQuery, { page: 1, limit: 20 });
        } catch (traktError) {
          // FALLBACK: Search database if Trakt fails despite health check
          console.warn('⚠️ Trakt search failed, falling back to database', traktError);
          const { data: dbShows, error: dbError } = await supabase
            .from('shows')
            .select('*')
            .ilike('title', `%${trimmedQuery}%`)
            .limit(20);
          
          if (dbError || !dbShows || dbShows.length === 0) {
            setShowSearchError('Search unavailable. Trakt API is currently down.');
            setIsSearchingShows(false);
            setTraktShowResults({ query: trimmedQuery.toLowerCase(), results: [] });
            return;
          }
          
          console.log(`📦 Found ${dbShows.length} shows from database fallback`);
          const mappedShows = dbShows.map(dbShow => ({
            show: mapDatabaseShowToShow(dbShow),
            traktShow: mapDatabaseShowToTraktShow(dbShow)
          }));
          
          setTraktShowResults({ query: trimmedQuery.toLowerCase(), results: mappedShows });
          setCurrentPage(1);
          setTotalPages(1);
          setHasMore(false);
          setIsSearchingShows(false);
          addSearchToHistory(trimmedQuery);
          return;
        }
        
        if (searchRequestTokenRef.current !== requestToken) {
          return;
        }
        
        const mappedShows = response.results.map(result => ({
          show: mapTraktShowToShow(result.show),
          traktShow: result.show
        }));
        
        setTraktShowResults({ query: trimmedQuery.toLowerCase(), results: mappedShows });
        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.pageCount);
        setHasMore(response.pagination.page < response.pagination.pageCount);
        setIsSearchingShows(false);
        
        addSearchToHistory(trimmedQuery);
        
        console.log(`📄 Loaded page ${response.pagination.page} of ${response.pagination.pageCount} (${response.pagination.itemCount} total items)`);
        
        response.results.forEach(async (result) => {
          const traktId = result.show.ids.trakt;
          setEnrichingShows(prev => new Set(prev).add(traktId));
          
          try {
            const enrichedData = await showEnrichmentManager.enrichShow(result.show);
            
            if (searchRequestTokenRef.current === requestToken && enrichedData.isEnriched) {
              setTraktShowResults(prevResults => {
                if (prevResults.query !== trimmedQuery.toLowerCase()) return prevResults;
                
                // Update the enriched show in-place without re-sorting
                // This preserves Trakt's relevance ordering
                const updatedResults = prevResults.results.map(r => {
                  if (r.traktShow.ids.trakt === traktId) {
                    const enrichedShow = {
                      ...r.show,
                      poster: enrichedData.posterUrl || r.show.poster,
                      totalSeasons: enrichedData.totalSeasons || r.show.totalSeasons,
                    };
                    
                    return {
                      ...r,
                      show: enrichedShow,
                      enrichedData
                    };
                  }
                  return r;
                });
                
                return { ...prevResults, results: updatedResults };
              });
            }
          } catch (error) {
            console.error('Error enriching show:', error);
          } finally {
            setEnrichingShows(prev => {
              const next = new Set(prev);
              next.delete(traktId);
              return next;
            });
          }
        });
      } catch (error) {
        if (searchRequestTokenRef.current !== requestToken) {
          return;
        }
        
        console.error('Error searching shows:', error);
        setShowSearchError('Failed to search shows. Please try again.');
        setIsSearchingShows(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeCategory]);

  // Helper functions - must be defined before renderItem to avoid temporal dead zone
  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };

  const handleSavePress = (show: Show, e: any) => {
    e.stopPropagation();
    setSelectedShow(show);
    setPlaylistModalVisible(true);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    console.log(`Show ${showId} added to playlist ${playlistId}`);
  };

  const handleFollowToggle = async (userId: string) => {
    try {
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const getKeyExtractor = useCallback((item: any, index: number) => {
    switch (activeCategory) {
      case 'shows':
        return item.id || `show-${index}`;
      case 'posts':
        return item.id || `post-${index}`;
      case 'comments':
        return item.id || `comment-${index}`;
      case 'users':
        return item.id || `user-${index}`;
      default:
        return `item-${index}`;
    }
  }, [activeCategory]);

  const handleEndReached = useCallback(() => {
    console.log('🔄 handleEndReached triggered!', {
      activeCategory,
      hasMore,
      isLoadingMore,
      isSearchingShows,
      currentPage,
      totalPages,
      resultsCount: traktShowResults.results.length
    });
    
    if (activeCategory === 'shows' && hasMore && !isLoadingMore && !isSearchingShows) {
      console.log('✅ Conditions met - calling loadMoreShows()');
      loadMoreShows();
    } else {
      console.log('❌ Conditions not met:', {
        isShowsTab: activeCategory === 'shows',
        hasMore,
        notLoadingMore: !isLoadingMore,
        notSearching: !isSearchingShows
      });
    }
  }, [activeCategory, hasMore, isLoadingMore, isSearchingShows, currentPage, totalPages, traktShowResults.results.length]);

  const renderEmptyState = useCallback(() => {
    // Show search history when no search query
    if (!searchQuery) {
      const currentHistory = searchHistory[activeCategory];
      
      if (currentHistory.length === 0) {
        return (
          <View style={styles.searchPlaceholder}>
            <FadeInImage 
              source={require('@/assets/search-placeholder.png')} 
              style={styles.placeholderImage}
              contentFit="contain"
            />
            <Text style={styles.placeholderTitle}>Type to search</Text>
            <Text style={styles.placeholderSubtitle}>
              Search shows, posts, comments or users...
            </Text>
          </View>
        );
      }
      
      return (
        <View style={styles.searchHistoryContainer}>
          {currentHistory.map((query, index) => (
            <SearchHistoryItem
              key={`${query}-${index}`}
              query={query}
              onPress={() => handleHistoryItemPress(query)}
              onRemove={() => removeFromSearchHistory(query)}
            />
          ))}
        </View>
      );
    }

    // Show loading state during initial search for shows
    if (activeCategory === 'shows' && isSearchingShows) {
      return (
        <View style={styles.skeletonContainer}>
          <SearchResultSkeleton />
          <SearchResultSkeleton />
          <SearchResultSkeleton />
          <SearchResultSkeleton />
          <SearchResultSkeleton />
        </View>
      );
    }

    // Show error state for shows if there's an error
    if (activeCategory === 'shows' && showSearchError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{showSearchError}</Text>
          <Pressable 
            style={styles.retryButton}
            onPress={() => {
              setShowSearchError(null);
              setSearchQuery(searchQuery + ' ');
              setTimeout(() => setSearchQuery(searchQuery.trim()), 100);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    // Show empty results message
    return (
      <View style={styles.emptyState}>
        <FadeInImage 
          source={require('@/attached_assets/right-pointing-magnifying-glass_1f50e_1761617614380.png')} 
          style={styles.emptyStateIcon}
          contentFit="contain"
        />
        <Text style={styles.emptyStateText}>No results found</Text>
        <Text style={styles.emptyStateSubtext}>
          Try searching for something else
        </Text>
      </View>
    );
  }, [searchQuery, isSearchingShows, activeCategory, showSearchError, searchHistory, handleHistoryItemPress, removeFromSearchHistory]);

  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase();

    switch (activeCategory) {
      case 'posts':
        if (!query) return [];
        
        let filteredPosts = posts;
        if (preselectedShow) {
          filteredPosts = posts.filter(post => post.show.id === preselectedShow.id);
        }
        filteredPosts = filteredPosts.filter(
          post =>
            post.title?.toLowerCase().includes(query) ||
            post.body.toLowerCase().includes(query) ||
            post.show.title.toLowerCase().includes(query)
        );
        
        return filteredPosts.sort((a, b) => {
          const aPopularity = (a.likes || 0) + (a.reposts || 0) + (a.comments || 0);
          const bPopularity = (b.likes || 0) + (b.reposts || 0) + (b.comments || 0);
          return bPopularity - aPopularity;
        });

      case 'comments':
        if (!query) return [];
        
        const filteredComments = mockComments.filter(comment =>
          comment.text.toLowerCase().includes(query)
        );
        
        return filteredComments.sort((a, b) => {
          return (b.likes || 0) - (a.likes || 0);
        });

      case 'shows':
        const showsToDisplay = traktShowResults.query === searchQuery.trim().toLowerCase() 
          ? traktShowResults.results.map(r => r.show)
          : [];
        
        return showsToDisplay.sort((a, b) => {
          if (b.friendsWatching !== a.friendsWatching) {
            return b.friendsWatching - a.friendsWatching;
          }
          
          const aPostCount = posts.filter(p => p.show.id === a.id).length;
          const bPostCount = posts.filter(p => p.show.id === b.id).length;
          return bPostCount - aPostCount;
        });

      case 'users':
        if (!query) return [];
        
        const filteredUsers = mockUsers.filter(
          user =>
            user.displayName.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.bio?.toLowerCase().includes(query)
        );
        
        return filteredUsers.sort((a, b) => {
          const aFollowers = a.followers?.length || 0;
          const bFollowers = b.followers?.length || 0;
          return bFollowers - aFollowers;
        });

      default:
        return [];
    }
  }, [searchQuery, activeCategory, posts, preselectedShow, traktShowResults]);

  const renderFooter = useCallback(() => {
    if (activeCategory !== 'shows') {
      return null;
    }

    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={tokens.colors.green} />
          <Text style={styles.loadingText}>Loading more shows...</Text>
        </View>
      );
    }

    if (hasMore && filteredResults.length > 0 && !isSearchingShows) {
      return (
        <View style={styles.loadingFooter}>
          <Text style={styles.loadMoreHint}>Scroll to load more</Text>
        </View>
      );
    }

    if (!hasMore && filteredResults.length > 0) {
      return (
        <View style={styles.loadingFooter}>
          <Text style={styles.allCaughtUpText}>All caught up! 🎬</Text>
        </View>
      );
    }

    return null;
  }, [activeCategory, isLoadingMore, hasMore, filteredResults.length, isSearchingShows]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    switch (activeCategory) {
      case 'posts':
        return (
          <FadeInView key={item.id} delay={index * 30}>
            <PostCard post={item} />
          </FadeInView>
        );

      case 'shows':
        const show = item;
        const traktId = traktShowResults.results.find(r => r.show.id === show.id)?.traktShow.ids.trakt;
        const isEnriching = traktId ? enrichingShows.has(traktId) : false;

        return (
          <FadeInView key={show.id} delay={index * 30}>
            <Pressable
              style={({ pressed }) => [styles.showCard, pressed && styles.pressed]}
              onPress={async () => {
              console.log('🎬 Show card pressed:', show.title);
              console.log('📊 Show data:', JSON.stringify(show, null, 2));
              
              try {
                setIsSavingShow(true);
                const traktShow = traktShowResults.results.find(r => r.show.id === show.id)?.traktShow;
                
                if (!traktShow) {
                  console.error('❌ Trakt show data not found for:', show.title);
                  setIsSavingShow(false);
                  return;
                }

                const enrichedInfo = traktShowResults.results.find(r => r.show.id === show.id)?.enrichedData;
                
                console.log('💾 Saving show to database (quick save with retry logic)...');
                const dbShow = await saveShow(traktShow, {
                  enrichedPosterUrl: enrichedInfo?.posterUrl,
                  enrichedBackdropUrl: enrichedInfo?.backdropUrl,
                  enrichedSeasonCount: enrichedInfo?.totalSeasons,
                  enrichedTVMazeId: enrichedInfo?.tvmazeId,
                  enrichedImdbId: enrichedInfo?.imdbId
                });
                console.log('✅ Show saved with DB UUID:', dbShow.id);
                
                console.log('🚀 Navigating to ShowHub with UUID:', dbShow.id);
                router.push(`/show/${dbShow.id}`);
              } catch (error) {
                console.error('❌ Error navigating to show:', error);
              } finally {
                setIsSavingShow(false);
              }
            }}
          >
            <View style={styles.showPosterContainer}>
              <FadeInImage 
                source={{ uri: getPosterUrl(show.poster, show.title) }} 
                style={styles.showPoster}
                priority="high"
                cachePolicy="memory-disk"
                contentFit="cover"
              />
              {isEnriching ? (
                <View style={styles.enrichingOverlay}>
                  <ActivityIndicator size="small" color={tokens.colors.green} />
                </View>
              ) : null}
              <Pressable
                style={styles.saveButton}
                onPress={(e) => handleSavePress(show, e)}
              >
                <IconSymbol
                  name={isShowSaved(show.id) ? "bookmark.fill" : "bookmark"}
                  size={20}
                  color={isShowSaved(show.id) ? tokens.colors.green : tokens.colors.grey1}
                />
              </Pressable>
            </View>
            <View style={styles.showInfo}>
              <Text style={styles.showTitle} numberOfLines={1}>
                {show.title}
              </Text>
              <Text style={styles.showDescription} numberOfLines={2}>
                {show.description}
              </Text>
              <View style={styles.showStats}>
                <View style={styles.stat}>
                  <IconSymbol name="star.fill" size={14} color="#8bfc76" />
                  <Text style={styles.statText}>{convertToFiveStarRating(show.rating).toFixed(1)}</Text>
                </View>
                <Text style={styles.statText}>{show.totalSeasons} Seasons</Text>
                <Text style={styles.statText}>{show.totalEpisodes} Episodes</Text>
              </View>
              {show.friendsWatching > 0 ? (
                <View style={styles.friendsRow}>
                  <IconSymbol name="person.2.fill" size={12} color={tokens.colors.grey1} />
                  <Text style={styles.friendsText}>{show.friendsWatching} friends watching</Text>
                </View>
              ) : null}
            </View>
            </Pressable>
          </FadeInView>
        );

      case 'users':
        const user = item;
        const isCurrentUserProfile = user.id === currentUser.id;
        
        return (
          <FadeInView key={user.id} delay={index * 30}>
            <View style={styles.userCardWrapper}>
              <UserCard
                username={user.username}
                displayName={user.displayName}
                bio={user.bio}
                avatar={user.avatar}
                isFollowing={isFollowing(user.id)}
                onPress={() => router.push(`/user/${user.id}`)}
                onFollowPress={() => handleFollowToggle(user.id)}
                showFollowButton={!isCurrentUserProfile}
              />
            </View>
          </FadeInView>
        );

      case 'comments':
        const comment = item;
        const post = posts.find(p => p.id === comment.postId);
        if (!post) return null;

        const timeAgo = formatTimeAgo(comment.timestamp);
        const episodeText = post.episodes && post.episodes.length > 0 
          ? `S${post.episodes[0].seasonNumber} E${post.episodes[0].episodeNumber}`
          : '';

        const postTitle = post.title || 'Untitled';
        const truncatedPostTitle = postTitle.length > 40 ? postTitle.slice(0, 40) + '...' : postTitle;
        const truncatedComment = comment.text.length > 60 ? comment.text.slice(0, 60) + '...' : comment.text;

        return (
          <FadeInView key={comment.id} delay={index * 30}>
            <Pressable
              style={({ pressed }) => [styles.commentCard, pressed && styles.pressed]}
              onPress={() => router.push(`/post/${comment.postId}`)}
            >
              <View style={styles.commentCardContent}>
                <FadeInImage source={{ uri: comment.user.avatar }} style={styles.commentAvatar} contentFit="cover" />
                <View style={styles.commentInfo}>
                  <Text style={styles.commentTextMixed}>
                    <Text style={styles.commentTextGreen}>{comment.user.displayName}</Text>
                    <Text style={styles.commentTextWhite}> commented on post "</Text>
                    <Text style={styles.commentTextWhite}>{truncatedPostTitle}</Text>
                    <Text style={styles.commentTextWhite}>" about </Text>
                    {episodeText ? (
                      <>
                        <Text style={styles.commentTextGreen}>{episodeText}</Text>
                        <Text style={styles.commentTextWhite}> of </Text>
                      </>
                    ) : null}
                    <Text style={styles.commentTextGreen}>{post.show.title}</Text>
                    <Text style={styles.commentTextWhite}>:</Text>
                  </Text>
                  <Text style={styles.commentTextMixed}>
                    <Text style={styles.commentTextWhite}>"{truncatedComment}"</Text>
                  </Text>
                  <Text style={styles.commentTime}>{timeAgo}</Text>
                </View>
              </View>
              <FadeInImage source={{ uri: getPosterUrl(post.show.poster, post.show.title) }} style={styles.commentShowPoster} contentFit="cover" />
            </Pressable>
          </FadeInView>
        );

      default:
        return null;
    }
  }, [activeCategory, enrichingShows, traktShowResults, isShowSaved, handleSavePress, currentUser.id, isFollowing, handleFollowToggle, posts, formatTimeAgo, router]);

  const loadMoreShows = async () => {
    if (isLoadingMore || isSearchingShows || !hasMore || activeCategory !== 'shows') {
      return;
    }

    const query = traktShowResults.query;
    if (!query) {
      return;
    }

    // Capture current request token to detect stale requests
    const requestToken = searchRequestTokenRef.current;
    
    console.log(`📄 Loading more shows: page ${currentPage + 1} of ${totalPages}`);
    setIsLoadingMore(true);

    try {
      const response = await searchShows(query, { page: currentPage + 1, limit: 20 });
      
      // Guard: Abort if search query changed while we were fetching
      if (searchRequestTokenRef.current !== requestToken) {
        console.log('⚠️ Aborting loadMore: search query changed during fetch');
        return;
      }
      
      const existingIds = new Set(traktShowResults.results.map(r => r.traktShow.ids.trakt));
      
      const newResults = response.results.filter(
        result => !existingIds.has(result.show.ids.trakt)
      );
      
      console.log(`✅ Loaded ${newResults.length} new shows (filtered ${response.results.length - newResults.length} duplicates)`);
      
      if (newResults.length > 0) {
        const mappedNewShows = newResults.map(result => ({
          show: mapTraktShowToShow(result.show),
          traktShow: result.show
        }));
        
        setTraktShowResults(prev => ({
          ...prev,
          results: [...prev.results, ...mappedNewShows]
        }));
        
        newResults.forEach(async (result) => {
          const traktId = result.show.ids.trakt;
          setEnrichingShows(prev => new Set(prev).add(traktId));
          
          try {
            const enrichedData = await showEnrichmentManager.enrichShow(result.show);
            
            // Guard: Abort enrichment update if search query changed
            if (searchRequestTokenRef.current !== requestToken) {
              console.log('⚠️ Aborting enrichment update: search query changed');
              return;
            }
            
            setTraktShowResults(prevResults => {
              const updatedResults = prevResults.results.map(r => {
                if (r.traktShow.ids.trakt === traktId && enrichedData.isEnriched) {
                  return {
                    ...r,
                    show: mapTraktShowToShow(r.traktShow, {
                      posterUrl: enrichedData.posterUrl,
                      totalSeasons: enrichedData.totalSeasons,
                    }),
                    enrichedData
                  };
                }
                return r;
              });
              
              return { ...prevResults, results: updatedResults };
            });
          } catch (error) {
            console.error('Error enriching show:', error);
          } finally {
            setEnrichingShows(prev => {
              const next = new Set(prev);
              next.delete(traktId);
              return next;
            });
          }
        });
      }
      
      setCurrentPage(response.pagination.page);
      setHasMore(response.pagination.page < response.pagination.pageCount);
    } catch (error) {
      console.error('Error loading more shows:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getResultsCount = useMemo(() => (category: SearchCategory): number => {
    const query = searchQuery.toLowerCase();
    if (!query) return 0;

    switch (category) {
      case 'shows':
        return traktShowResults.query === query ? traktShowResults.results.length : 0;
      
      case 'posts':
        let filteredPosts = preselectedShow 
          ? posts.filter(post => post.show.id === preselectedShow.id)
          : posts;
        return filteredPosts.filter(
          post =>
            post.title?.toLowerCase().includes(query) ||
            post.body.toLowerCase().includes(query) ||
            post.show.title.toLowerCase().includes(query)
        ).length;
      
      case 'comments':
        return mockComments.filter(comment =>
          comment.text.toLowerCase().includes(query)
        ).length;
      
      case 'users':
        return mockUsers.filter(
          user =>
            user.displayName.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.bio?.toLowerCase().includes(query)
        ).length;
      
      default:
        return 0;
    }
  }, [searchQuery, posts, preselectedShow, traktShowResults]);

  const tabs: Tab[] = [
    { key: 'shows', label: 'Shows', hasIndicator: searchQuery.length > 0 && activeCategory !== 'shows' && getResultsCount('shows') > 0 },
    { key: 'posts', label: 'Posts', hasIndicator: searchQuery.length > 0 && activeCategory !== 'posts' && getResultsCount('posts') > 0 },
    { key: 'comments', label: 'Comments', hasIndicator: searchQuery.length > 0 && activeCategory !== 'comments' && getResultsCount('comments') > 0 },
    { key: 'users', label: 'Users', hasIndicator: searchQuery.length > 0 && activeCategory !== 'users' && getResultsCount('users') > 0 },
  ];

  const handleRemoveShowFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFilter(undefined);
    router.setParams({ showId: undefined });
  };

  const renderShowFilter = () => {
    if (!preselectedShow) return null;

    return (
      <View style={styles.filterChipContainer}>
        <View style={styles.filterChip}>
          <Text style={styles.filterChipText}>{preselectedShow.title}</Text>
          <Pressable 
            onPress={handleRemoveShowFilter} 
            style={styles.filterChipClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={tokens.colors.almostWhite} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    );
  };

  // Note: renderResults() has been removed - we now use FlatList with renderItem instead

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.pageContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={tokens.colors.grey1} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor={tokens.colors.grey1}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={tokens.colors.grey1} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Show TabSelector only when searching (not in genre/section views) */}
        {searchQuery.trim().length > 0 && !params.genre && !params.section ? (
          <View style={styles.tabSelectorWrapper}>
            <TabSelector
              tabs={tabs}
              activeTab={activeCategory}
              onTabChange={handleTabChange}
              variant="default"
            />
          </View>
        ) : null}

        {renderShowFilter()}

        {/* Genre Detail View with Infinite Scroll */}
        {params.genre && searchQuery.trim().length === 0 ? (
          <FlatList
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailContainer}
            data={genreShows}
            numColumns={3}
            columnWrapperStyle={styles.detailColumnWrapper}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            ListHeaderComponent={
              <View style={styles.detailHeader}>
                <Pressable 
                  style={styles.backButton}
                  onPress={() => router.push('/search?tab=shows')}
                >
                  <IconSymbol name="chevron.left" size={20} color={tokens.colors.almostWhite} />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <Text style={styles.detailTitle}>
                  {getGenreEmoji(params.genre as string)} {(params.genre as string).charAt(0).toUpperCase() + (params.genre as string).slice(1)}
                </Text>
              </View>
            }
            renderItem={({ item: show }) => (
              <Pressable
                style={styles.gridItem}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
              >
                <View style={styles.gridPosterWrapper}>
                  <FadeInImage
                    source={{ uri: show.poster || getPosterUrl(show.title || '', show.id.toString()) }}
                    style={styles.gridPoster}
                    contentFit="cover"
                  />
                  {/* Bookmark Icon */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.gridSaveIcon,
                      pressed && styles.gridSaveIconPressed
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedShow(show);
                      setPlaylistModalVisible(true);
                    }}
                  >
                    <IconSymbol
                      name="bookmark"
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
                <Text style={styles.gridTitle} numberOfLines={2}>{show.title}</Text>
                {show.year && <Text style={styles.gridYear}>{show.year}</Text>}
              </Pressable>
            )}
            ListEmptyComponent={
              isLoadingGenre ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No shows found for this genre</Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoadingGenre && genreShows.length > 0 ? (
                <View style={styles.loadingFooter}>
                  <ActivityIndicator size="small" color={tokens.colors.greenHighlight} />
                </View>
              ) : null
            }
            onEndReached={loadMoreGenreShows}
            onEndReachedThreshold={0.5}
          />
        ) : params.section && searchQuery.trim().length === 0 ? (
          <FlatList
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailContainer}
            data={sectionShows}
            numColumns={3}
            columnWrapperStyle={styles.detailColumnWrapper}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            ListHeaderComponent={
              <View style={styles.detailHeader}>
                <Pressable 
                  style={styles.backButton}
                  onPress={() => router.push('/search?tab=shows')}
                >
                  <IconSymbol name="chevron.left" size={20} color={tokens.colors.almostWhite} />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <Text style={styles.detailTitle}>{getSectionTitle(params.section as string, params)}</Text>
              </View>
            }
            renderItem={({ item: show }) => (
              <Pressable
                style={styles.gridItem}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
              >
                <View style={styles.gridPosterWrapper}>
                  <FadeInImage
                    source={{ uri: show.poster || getPosterUrl(show.title || '', show.id.toString()) }}
                    style={styles.gridPoster}
                    contentFit="cover"
                  />
                  {/* Bookmark Icon */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.gridSaveIcon,
                      pressed && styles.gridSaveIconPressed
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedShow(show);
                      setPlaylistModalVisible(true);
                    }}
                  >
                    <IconSymbol
                      name="bookmark"
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
                <Text style={styles.gridTitle} numberOfLines={2}>{show.title}</Text>
                {show.year && <Text style={styles.gridYear}>{show.year}</Text>}
              </Pressable>
            )}
            ListEmptyComponent={
              isLoadingSection ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No shows found for this section</Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoadingSection && sectionShows.length > 0 ? (
                <View style={styles.loadingFooter}>
                  <ActivityIndicator size="small" color={tokens.colors.greenHighlight} />
                </View>
              ) : null
            }
            onEndReached={loadMoreSectionShows}
            onEndReachedThreshold={0.5}
          />
        ) : searchQuery.trim().length === 0 ? (
          <RNScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.curatedContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={tokens.colors.almostWhite}
                colors={[tokens.colors.almostWhite]}
              />
            }
          >
            {forYouShows.length > 0 ? (
              <ExploreShowSection
                title="For You"
                shows={forYouShows}
                onShowPress={async (show) => {
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
                onBookmarkPress={(show) => {
                  setSelectedShow(show as Show);
                  setPlaylistModalVisible(true);
                }}
                isShowSaved={isShowSaved}
                onViewMore={() => router.push('/search?tab=shows&section=for-you')}
              />
            ) : null}

            {trendingShows.length > 0 ? (
              <ExploreShowSection
                title="Trending"
                shows={trendingShows}
                onShowPress={async (show) => {
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
                onBookmarkPress={(show) => {
                  setSelectedShow(show as Show);
                  setPlaylistModalVisible(true);
                }}
                isShowSaved={isShowSaved}
                onViewMore={() => router.push('/search?tab=shows&section=trending')}
              />
            ) : null}

            {becauseYouWatchedSections
              .filter(section => section.relatedShows.length > 0)
              .map((section, index) => (
                <ExploreShowSection
                  key={`because-you-watched-${section.show.id}-${index}`}
                  title={`Because You Watched ${section.show.title}`}
                  shows={section.relatedShows}
                  seedShow={{
                    id: section.show.id,
                    title: section.show.title,
                    traktId: section.show.traktId,
                    year: section.show.year,
                    rating: section.show.rating,
                    genres: section.show.genres,
                  }}
                  onShowPress={async (show) => {
                    const uuid = await ensureShowUuid(show, show.traktShow);
                    router.push(`/show/${uuid}`);
                  }}
                  onBookmarkPress={(show) => {
                    setSelectedShow(show as Show);
                    setPlaylistModalVisible(true);
                  }}
                  isShowSaved={isShowSaved}
                  onViewMore={() => router.push(`/search?tab=shows&section=because-you-watched&seedShowId=${section.show.id}&seedShowTitle=${encodeURIComponent(section.show.title)}&seedShowTraktId=${section.show.traktId}&seedShowYear=${section.show.year || ''}&seedShowRating=${section.show.rating || ''}&seedShowGenres=${encodeURIComponent(JSON.stringify(section.show.genres || []))}`)}
                />
              ))}

            {popularRewatchesShows.length > 0 ? (
              <ExploreShowSection
                title="Popular Rewatches"
                shows={popularRewatchesShows}
                onShowPress={async (show) => {
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
                onBookmarkPress={(show) => {
                  setSelectedShow(show as Show);
                  setPlaylistModalVisible(true);
                }}
                isShowSaved={isShowSaved}
                onViewMore={() => router.push('/search?tab=shows&section=popular-rewatches')}
              />
            ) : null}

            {allGenres.length > 0 ? (
              <View style={styles.genresSection}>
                <Text style={styles.genresTitle}>Genres</Text>
                <FlatList
                  data={allGenres.slice(0, Math.ceil(allGenres.length / 2))}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.genreRow}
                  renderItem={({ item: genre }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.genreButton,
                        pressed && styles.genreButtonPressed
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/search?tab=shows&genre=${encodeURIComponent(genre)}`);
                      }}
                    >
                      <Text style={styles.genreButtonText}>
                        {getGenreEmoji(genre)} {genre.charAt(0).toUpperCase() + genre.slice(1)}
                      </Text>
                    </Pressable>
                  )}
                  keyExtractor={(item) => item}
                  snapToInterval={140}
                  decelerationRate="fast"
                />
                <FlatList
                  data={allGenres.slice(Math.ceil(allGenres.length / 2))}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.genreRow}
                  renderItem={({ item: genre }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.genreButton,
                        pressed && styles.genreButtonPressed
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/search?tab=shows&genre=${encodeURIComponent(genre)}`);
                      }}
                    >
                      <Text style={styles.genreButtonText}>
                        {getGenreEmoji(genre)} {genre.charAt(0).toUpperCase() + genre.slice(1)}
                      </Text>
                    </Pressable>
                  )}
                  keyExtractor={(item) => item}
                  snapToInterval={140}
                  decelerationRate="fast"
                />
              </View>
            ) : null}
          </RNScrollView>
        ) : (
          <FlatList
            data={filteredResults}
            renderItem={renderItem}
            keyExtractor={getKeyExtractor}
            style={styles.scrollView}
            contentContainerStyle={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={activeCategory === 'shows' ? handleEndReached : undefined}
            onEndReachedThreshold={Platform.OS === 'web' ? 2.0 : 0.5}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}

      {selectedShow ? (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShow(null);
          }}
          show={selectedShow}
          onAddToPlaylist={handleAddToPlaylist}
        />
      ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
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
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    ...tokens.typography.p1B,
    color: tokens.colors.pureWhite,
    marginBottom: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Funnel Display',
    fontWeight: '400',
    color: tokens.colors.black,
  },
  tabSelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  filterChipContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.pageBackground,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
  },
  filterChipText: {
    ...tokens.typography.p1B,
    color: tokens.colors.almostWhite,
  },
  filterChipClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 100,
    gap: 10,
  },
  curatedContainer: {
    paddingTop: 18,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    width: 40,
    height: 40,
  },
  emptyStateText: {
    ...tokens.typography.titleL,
    color: tokens.colors.almostWhite,
    marginTop: 18,
  },
  emptyStateSubtext: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    marginTop: 8,
    textAlign: 'center',
  },
  searchPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  placeholderImage: {
    width: 300,
    height: 200,
    marginBottom: 24,
  },
  placeholderTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.almostWhite,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    padding: 11,
    gap: 17,
  },
  pressed: {
    opacity: 0.8,
  },
  showPosterContainer: {
    position: 'relative',
    width: 80.34,
    height: 98.79,
  },
  showPoster: {
    width: 80.34,
    height: 98.79,
    borderRadius: 8,
  },
  placeholderPoster: {
    width: 80.34,
    height: 98.79,
    borderRadius: 8,
    backgroundColor: tokens.colors.cardBackground,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enrichingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 13,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.pureWhite,
    marginBottom: 4,
  },
  showDescription: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    lineHeight: 15.6,
    marginBottom: 8,
  },
  showStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...tokens.typography.p3M,
    color: tokens.colors.grey1,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  friendsText: {
    ...tokens.typography.p3M,
    color: tokens.colors.grey1,
  },
  userCardWrapper: {
    marginBottom: 12,
  },
  commentCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  commentCardContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
    alignItems: 'center',
  },
  commentAvatar: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
  },
  commentInfo: {
    flex: 1,
    gap: 5,
  },
  commentTextMixed: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    letterSpacing: -0.24,
  },
  commentTextGreen: {
    fontWeight: '600',
    color: tokens.colors.greenHighlight,
  },
  commentTextWhite: {
    fontWeight: '400',
    color: tokens.colors.pureWhite,
  },
  commentTime: {
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  commentShowPoster: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  skeletonContainer: {
    gap: 10,
  },
  loadingText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: tokens.colors.greenHighlight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    ...tokens.typography.p1B,
    color: tokens.colors.black,
  },
  showPosterPlaceholder: {
    backgroundColor: tokens.colors.grey2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showPosterPlaceholderText: {
    ...tokens.typography.titleL,
    color: tokens.colors.grey1,
  },
  loadingFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadMoreHint: {
    ...tokens.typography.p2,
    color: tokens.colors.grey1,
  },
  allCaughtUpText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
  searchHistoryContainer: {
    width: '100%',
  },
  searchHistoryTitle: {
    ...tokens.typography.h3,
    color: tokens.colors.pureWhite,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  genresSection: {
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  genresTitle: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    marginBottom: 5,
    paddingHorizontal: 20,
  },
  genreRow: {
    gap: 10,
    paddingHorizontal: 20,
  },
  genreButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
    marginRight: 10,
  },
  genreButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  genreButtonText: {
    ...tokens.typography.p2M,
    color: tokens.colors.almostWhite,
  },
  detailContainer: {
    paddingTop: 18,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  detailHeader: {
    marginBottom: 20,
  },
  detailColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    ...tokens.typography.p2M,
    color: tokens.colors.almostWhite,
  },
  detailTitle: {
    ...tokens.typography.h2,
    color: tokens.colors.pureWhite,
  },
  nanoGenreFilters: {
    paddingBottom: 20,
  },
  nanoGenrePillsContainer: {
    gap: 10,
    paddingHorizontal: 20,
  },
  nanoGenrePill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  nanoGenrePillActive: {
    backgroundColor: tokens.colors.greenHighlight,
    borderColor: tokens.colors.greenHighlight,
  },
  nanoGenrePillText: {
    ...tokens.typography.p3M,
    color: tokens.colors.almostWhite,
    fontSize: 12,
  },
  nanoGenrePillTextActive: {
    color: tokens.colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    gap: 10,
  },
  gridItem: {
    width: '31.5%',
  },
  gridPosterWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 2 / 3,
  },
  gridPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: tokens.colors.cardBackground,
  },
  gridSaveIcon: {
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
  gridSaveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  gridTitle: {
    ...tokens.typography.p2M,
    color: tokens.colors.almostWhite,
    marginTop: 8,
  },
  gridYear: {
    ...tokens.typography.p3,
    color: tokens.colors.grey1,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
});
