import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, Platform, ImageBackground, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
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
import { supabase } from '@/app/integrations/supabase/client';
import { isTraktHealthy } from '@/services/traktHealth';
import { getTrendingShows, getRecentlyReleasedShows, getPopularShowsByGenre } from '@/services/trakt';
import { getUserInterests, getAllGenres } from '@/services/userInterests';
import ExploreShowSection from '@/components/ExploreShowSection';
import { ScrollView as RNScrollView } from 'react-native';

type SearchCategory = 'shows' | 'users' | 'posts' | 'comments';

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
  const [friendActivityShows, setFriendActivityShows] = useState<any[]>([]);
  const [forYouShows, setForYouShows] = useState<any[]>([]);
  const [trendingShows, setTrendingShows] = useState<any[]>([]);
  const [recentlyReleasedShows, setRecentlyReleasedShows] = useState<any[]>([]);
  const [genreSections, setGenreSections] = useState<Array<{ genre: string; shows: any[] }>>([]);
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [isLoadingCurated, setIsLoadingCurated] = useState(false);

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
        // 1. Friend Activity - get shows friends have watched
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
            id: item.show.id || `trakt-${item.show.traktId}`
          }))
          .slice(0, 12);
        
        setFriendActivityShows(friendShows);
        
        // 2. Get user interests
        const interests = await getUserInterests(currentUser.id);
        setUserGenres(interests.genres);
        
        // 3. For You - popular shows in user's interests
        if (interests.genres.length > 0) {
          const forYouPromises = interests.genres.slice(0, 3).map(genre => 
            getPopularShowsByGenre(genre, 5)
          );
          const forYouResults = await Promise.all(forYouPromises);
          const forYouShowsList = forYouResults.flat()
            .slice(0, 12)
            .map(traktShow => {
              const show = mapTraktShowToShow(traktShow);
              return {
                ...show,
                id: show.id || `trakt-${traktShow.ids.trakt}`,
                traktId: traktShow.ids.trakt,
                traktShow
              };
            });
          setForYouShows(forYouShowsList);
        }
        
        // 4. Trending
        const trending = await getTrendingShows(12);
        const trendingMapped = trending.map(traktShow => {
          const show = mapTraktShowToShow(traktShow);
          return {
            ...show,
            id: show.id || `trakt-${traktShow.ids.trakt}`,
            traktId: traktShow.ids.trakt,
            traktShow
          };
        });
        setTrendingShows(trendingMapped);
        
        // 5. Recently Released
        const recent = await getRecentlyReleasedShows(12);
        const recentMapped = recent.map(traktShow => {
          const show = mapTraktShowToShow(traktShow);
          return {
            ...show,
            id: show.id || `trakt-${traktShow.ids.trakt}`,
            traktId: traktShow.ids.trakt,
            traktShow
          };
        });
        setRecentlyReleasedShows(recentMapped);
        
        // 6. Genre Sections
        const allGenres = getAllGenres();
        const userGenreSet = new Set(interests.genres.map(g => g.toLowerCase()));
        const orderedGenres = [
          ...interests.genres.slice(0, 5),
          ...allGenres.filter(g => !userGenreSet.has(g.toLowerCase()))
        ];
        
        const genrePromises = orderedGenres.slice(0, 10).map(async (genre) => {
          try {
            const shows = await getPopularShowsByGenre(genre, 12);
            return {
              genre,
              shows: shows.map(traktShow => {
                const show = mapTraktShowToShow(traktShow);
                return {
                  ...show,
                  id: show.id || `trakt-${traktShow.ids.trakt}`,
                  traktId: traktShow.ids.trakt,
                  traktShow
                };
              })
            };
          } catch (error) {
            console.error(`Error fetching genre ${genre}:`, error);
            return { genre, shows: [] };
          }
        });
        
        const genres = await Promise.all(genrePromises);
        setGenreSections(genres.filter(g => g.shows.length > 0));
        
      } catch (error) {
        console.error('Error loading curated content:', error);
      } finally {
        setIsLoadingCurated(false);
      }
    };
    
    loadCuratedContent();
  }, [searchQuery, currentUser, posts]);

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
              {isEnriching && (
                <View style={styles.enrichingOverlay}>
                  <ActivityIndicator size="small" color={tokens.colors.green} />
                </View>
              )}
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
              {show.friendsWatching > 0 && (
                <View style={styles.friendsRow}>
                  <IconSymbol name="person.2.fill" size={12} color={tokens.colors.grey1} />
                  <Text style={styles.friendsText}>{show.friendsWatching} friends watching</Text>
                </View>
              )}
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
                    {episodeText && (
                      <>
                        <Text style={styles.commentTextGreen}>{episodeText}</Text>
                        <Text style={styles.commentTextWhite}> of </Text>
                      </>
                    )}
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
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={tokens.colors.grey1} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Show TabSelector only when searching */}
        {searchQuery.trim().length > 0 && (
          <View style={styles.tabSelectorWrapper}>
            <TabSelector
              tabs={tabs}
              activeTab={activeCategory}
              onTabChange={handleTabChange}
              variant="default"
            />
          </View>
        )}

        {renderShowFilter()}

        {/* Curated Content (when not searching) */}
        {searchQuery.trim().length === 0 ? (
          <RNScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.curatedContainer}
          >
            {friendActivityShows.length > 0 && (
              <ExploreShowSection
                title="Friend Activity"
                shows={friendActivityShows}
                onShowPress={async (show) => {
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
                onBookmarkPress={(show) => {
                  setSelectedShow(show as Show);
                  setPlaylistModalVisible(true);
                }}
                isShowSaved={isShowSaved}
              />
            )}

            {forYouShows.length > 0 && (
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
              />
            )}

            {trendingShows.length > 0 && (
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
              />
            )}

            {recentlyReleasedShows.length > 0 && (
              <ExploreShowSection
                title="Recently Released"
                shows={recentlyReleasedShows}
                onShowPress={async (show) => {
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
                onBookmarkPress={(show) => {
                  setSelectedShow(show as Show);
                  setPlaylistModalVisible(true);
                }}
                isShowSaved={isShowSaved}
              />
            )}

            {genreSections.map((section) => (
              <ExploreShowSection
                key={section.genre}
                title={section.genre.charAt(0).toUpperCase() + section.genre.slice(1)}
                shows={section.shows}
                isGenreSection
                onShowPress={async (show) => {
                  const uuid = await ensureShowUuid(show, show.traktShow);
                  router.push(`/show/${uuid}`);
                }}
                onBookmarkPress={(show) => {
                  setSelectedShow(show as Show);
                  setPlaylistModalVisible(true);
                }}
                isShowSaved={isShowSaved}
              />
            ))}
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

      {selectedShow && (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShow(null);
          }}
          show={selectedShow}
          onAddToPlaylist={handleAddToPlaylist}
        />
      )}
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
});
