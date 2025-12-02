
import { supabase } from '@/integrations/supabase/client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Post, Show, User, Playlist, Episode, FeedItem, SocialLink } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { generateAvatarDataURI } from '@/utils/profilePictureGenerator';
import { checkPostForModeration } from '@/services/contentModeration';
import { checkRateLimit } from '@/services/rateLimiting';

interface UserData {
  following: string[];
  followers: string[];
}

interface RepostData {
  postId: string;
  userId: string;
  timestamp: Date;
}

export interface CreatePostData extends Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'reposts' | 'isLiked'> {
  skipRating?: boolean;
}

export interface WatchHistoryItem {
  show: Show;
  mostRecentEpisode: Episode | null;
  loggedCount: number;
  totalCount: number;
  lastWatchedDate: Date;
}

interface DataContextType {
  playlists: Playlist[];
  createPlaylist: (name: string, showId?: string) => Promise<Playlist>;
  addShowToPlaylist: (playlistId: string, showId: string, traktId?: number) => Promise<void>;
  removeShowFromPlaylist: (playlistId: string, showId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  isShowInPlaylist: (playlistId: string, showId: string) => boolean;
  updatePlaylistPrivacy: (playlistId: string, isPublic: boolean) => Promise<void>;
  loadPlaylists: (userId?: string) => Promise<void>;
  recordTraktIdMapping: (traktId: number, uuid: string) => void;
  posts: Post[];
  createPost: (post: CreatePostData) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  repostPost: (postId: string) => Promise<void>;
  unrepostPost: (postId: string) => Promise<void>;
  updateCommentCount: (postId: string, count: number) => Promise<void>;
  getPost: (postId: string) => Post | undefined;
  hasUserReposted: (postId: string) => boolean;
  getUserReposts: () => Post[];
  allReposts: { post: Post; repostedBy: User; timestamp: Date }[];
  reportedPostIds: Set<string>;
  hasUserReportedPost: (postId: string) => boolean;
  unreportPost: (postId: string) => Promise<void>;
  currentUser: User;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  getFollowers: (userId: string) => Promise<User[]>;
  getFollowing: (userId: string) => Promise<User[]>;
  getTopFollowers: (userId: string, limit?: number) => Promise<User[]>;
  getTopFollowing: (userId: string, limit?: number) => Promise<User[]>;
  getEpisodesWatchedCount: (userId: string) => Promise<number>;
  getTotalLikesReceived: (userId: string) => Promise<number>;
  getWatchHistory: (userId: string) => WatchHistoryItem[];
  isLoading: boolean;
  isDeletingPost: boolean;
  cachedRecommendations: CachedRecommendation[];
  isLoadingRecommendations: boolean;
  recommendationsReady: boolean;
  loadRecommendations: (options?: { force?: boolean }) => Promise<void>;
  getProfileFeed: (userId: string) => FeedItem[];
  getHomeFeed: () => FeedItem[];
  ensureShowUuid: (show: Show, traktShow?: any) => Promise<string>;
}

const STORAGE_KEYS = {
  POSTS: '@natively_posts',
  USER_DATA: '@natively_user_data',
  REPOSTS: '@natively_reposts',
  PLAYLISTS: '@natively_playlists',
  TRAKT_ID_MAP: '@natively_trakt_id_map',
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

const EMPTY_USER: User = {
  id: '',
  username: '',
  displayName: '',
  avatar: '',
  bio: '',
  socialLinks: [],
  following: [],
  followers: [],
};

interface CachedRecommendation {
  show: Show;
  traktShow: any;
  traktId: number;
  isDatabaseBacked: boolean;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, profileRefreshKey, authReady } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [userData, setUserData] = useState<UserData>({
    following: [],
    followers: [],
  });
  const [reposts, setReposts] = useState<RepostData[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  const [currentUserData, setCurrentUserData] = useState<User>(EMPTY_USER);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  
  const [userProfileCache, setUserProfileCache] = useState<Record<string, User>>({});
  const [cachedRecommendations, setCachedRecommendations] = useState<CachedRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [traktIdToUuidMap, setTraktIdToUuidMap] = useState<Map<number, string>>(new Map());
  const [reportedPostIds, setReportedPostIds] = useState<Set<string>>(new Set());
  
  // Memoize currentUser to prevent recreation on every render
  const currentUser = useMemo(() => ({
    ...currentUserData,
    following: userData.following,
    followers: userData.followers,
  }), [currentUserData, userData.following, userData.followers]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load posts
      const postsData = await AsyncStorage.getItem(STORAGE_KEYS.POSTS);
      if (postsData) {
        const parsedPosts = JSON.parse(postsData);
        setPosts(parsedPosts.map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp),
        })));
      }

      // Load user data
      const userDataStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataStr) {
        setUserData(JSON.parse(userDataStr));
      }

      // Load reposts
      const repostsData = await AsyncStorage.getItem(STORAGE_KEYS.REPOSTS);
      if (repostsData) {
        const parsedReposts = JSON.parse(repostsData);
        setReposts(parsedReposts.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })));
      }

      // Load playlists
      const playlistsData = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (playlistsData) {
        const parsedPlaylists = JSON.parse(playlistsData);
        setPlaylists(parsedPlaylists.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        })));
      }
      
      // Load Trakt ID -> UUID mapping
      const traktIdMapData = await AsyncStorage.getItem(STORAGE_KEYS.TRAKT_ID_MAP);
      if (traktIdMapData) {
        const mapObject = JSON.parse(traktIdMapData);
        // Convert keys back to numbers (JSON stringifies number keys)
        const newMap = new Map<number, string>();
        Object.entries(mapObject).forEach(([key, value]) => {
          newMap.set(parseInt(key), value as string);
        });
        setTraktIdToUuidMap(newMap);
        console.log(`✅ Loaded ${newMap.size} Trakt ID -> UUID mappings from storage`);
      }
      
      // Mark as hydrated after initial load
      setIsHydrated(true);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isHydrated]);

  // Load current user's profile from Supabase
  const loadCurrentUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('Loading current user profile from Supabase:', userId);
      
      // Fetch profile and social links in parallel
      const [profileResult, socialLinksResult] = await Promise.all([
        supabase
          .from('profiles' as any)
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('social_links' as any)
          .select('*')
          .eq('user_id', userId)
      ]);

      if (profileResult.error) {
        console.error('Error loading user profile:', profileResult.error);
        return;
      }

      if (profileResult.data) {
        const profileData = profileResult.data as any;
        // Read is_admin directly from profile, with fallback to known admin IDs
        const KNOWN_ADMIN_IDS = ['0e8b3464-d39e-4881-87de-033ca899657d'];
        const isAdmin = profileData.is_admin === true || KNOWN_ADMIN_IDS.includes(userId);
        console.log('✅ Loaded user profile:', profileData.username, 'is_admin:', isAdmin);
        
        // Generate avatar data URI if no uploaded avatar but has auto-generated avatar config
        let avatarUrl = profileData.avatar_url || '';
        if (!avatarUrl && profileData.avatar_color_scheme && profileData.avatar_icon) {
          avatarUrl = generateAvatarDataURI(profileData.avatar_color_scheme, profileData.avatar_icon);
          console.log('🎨 Generated avatar data URI for user:', profileData.username);
        }
        
        // Fetch social links for current user
        const socialLinks: SocialLink[] = socialLinksResult.data
          ? socialLinksResult.data.map((link: any) => ({
              platform: link.platform,
              url: link.url,
            }))
          : [];
        
        const userData = {
          id: userId,
          username: profileData.username || 'user',
          displayName: profileData.display_name || profileData.username || 'User',
          avatar: avatarUrl,
          bio: profileData.bio || '',
          socialLinks,
          following: [],
          followers: [],
          is_admin: isAdmin,
        };
        
        setCurrentUserData(userData);
        
        // Add current user to profile cache so their comments show correct username
        console.log('📝 Adding current user to profile cache:', userId, userData.username);
        setUserProfileCache(prev => ({
          ...prev,
          [userId]: userData
        }));
      }
    } catch (error) {
      console.error('Error loading user profile from Supabase:', error);
    }
  }, [isHydrated]);

  const loadFollowDataFromSupabase = useCallback(async (userId: string) => {
    try {
      console.log('Loading follow data from Supabase for user:', userId);
      
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) {
        console.error('Error loading following data:', followingError);
      } else {
        const followingIds = followingData?.map(f => f.following_id) || [];
        console.log('✅ Loaded following from Supabase:', followingIds.length, 'users');
        
        setUserData(prev => {
          const prevSorted = [...prev.following].sort();
          const newSorted = [...followingIds].sort();
          const followingChanged = JSON.stringify(prevSorted) !== JSON.stringify(newSorted);
          if (followingChanged) {
            return {
              ...prev,
              following: followingIds,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error loading follow data from Supabase:', error);
    }
  }, [isHydrated]);

  // Recommendation caching with staleness checking (10-minute cache)
  const RECOMMENDATION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const CACHE_VERSION = 2; // Increment to invalidate old caches (v2: added endYear support)
  const loadRecommendationsRef = useRef<Promise<any> | null>(null);
  const lastRecommendationFetchRef = useRef<{ timestamp: number; version: number } | null>(null);
  const [lastRecommendationFetch, setLastRecommendationFetch] = useState<{ timestamp: number; version: number } | null>(null);
  const hasPreloadedForUserRef = useRef<string | null>(null);
  const currentAuthUserIdRef = useRef<string | null>(null); // Ref for cross-user contamination check

  const loadRecommendations = useCallback(async (options: { force?: boolean; userId?: string } = {}) => {
    // Skip if we already have a fresh fetch (regardless of result count) - unless forced
    if (!options.force && lastRecommendationFetchRef.current) {
      const cache = lastRecommendationFetchRef.current;
      const age = Date.now() - cache.timestamp;
      // Invalidate cache if version mismatch
      if (cache.version !== CACHE_VERSION) {
        console.log('📊 Cache version mismatch - clearing stale cache and refetching');
        setCachedRecommendations([]);
        setLastRecommendationFetch(null);
        lastRecommendationFetchRef.current = null;
        // Continue to fetch new data
      } else if (age < RECOMMENDATION_CACHE_TTL) {
        console.log('📊 Using cached recommendations (age:', Math.floor(age / 1000), 'seconds, count:', cachedRecommendations.length, ')');
        return;
      }
    }

    // Mutex: If already loading, return existing promise
    if (loadRecommendationsRef.current) {
      console.log('📊 Recommendation load already in progress, waiting...');
      return loadRecommendationsRef.current;
    }

    // Use provided userId or fall back to authUserId
    const requestUserId = options.userId || authUserId;

    const loadPromise = (async () => {
      try {
        console.log('📊 Preloading recommendations for instant PostModal display...');
        setIsLoadingRecommendations(true);

        const { getCombinedRecommendations } = await import('@/services/recommendations');
        const { mapDatabaseShowToShow, mapTraktShowToShow } = await import('@/services/showMappers');
        const { getShowDetails } = await import('@/services/trakt');
        const { getShowById } = await import('@/services/showDatabase');
        const { isTraktHealthy } = await import('@/services/traktHealth');

        if (!requestUserId) {
          console.warn('Cannot load recommendations: no authenticated user');
          // DON'T set timestamp when userId is missing - this would prevent future loads
          return;
        }

        // Check Trakt API health before attempting enrichment
        const traktHealthy = await isTraktHealthy();
        if (!traktHealthy) {
          console.log('⚠️ Trakt API unavailable - using database-only recommendations');
        }

        const recommendations = await getCombinedRecommendations(requestUserId, 25);
        console.log(`✅ Fetched ${recommendations.length} raw recommendations for caching`);

        // Convert to display-ready format (same as PostModal)
        const convertedShows = await Promise.all(
          recommendations.map(async (rec) => {
            if (rec.isFromDatabase && rec.id) {
              const dbShow = await getShowById(rec.id);
              if (!dbShow) return null;

              // Use database data directly if Trakt is down
              if (!traktHealthy) {
                return {
                  show: mapDatabaseShowToShow(dbShow),
                  traktShow: null,
                  traktId: dbShow.trakt_id,
                  isDatabaseBacked: true
                };
              }

              // Try to enrich with Trakt if available
              let traktShow: any;
              let enrichedData: any = null;
              try {
                traktShow = await getShowDetails(dbShow.trakt_id);
                if (traktShow) {
                  const { showEnrichmentManager } = await import('@/services/showEnrichment');
                  enrichedData = await showEnrichmentManager.enrichShow(traktShow);
                }
              } catch (error) {
                console.warn(`Failed to fetch Trakt details for ${dbShow.trakt_id}, using database only`);
              }

              // Enrich poster if missing and Trakt worked
              let posterUrl = dbShow.poster_url || enrichedData?.posterUrl;

              // Add end_year to traktShow if available
              if (traktShow && enrichedData?.endYear) {
                traktShow = {
                  ...traktShow,
                  end_year: enrichedData.endYear
                };
              }

              return {
                show: { ...mapDatabaseShowToShow(dbShow), poster: posterUrl },
                traktShow,
                traktId: dbShow.trakt_id,
                isDatabaseBacked: true
              };
            } else if (!traktHealthy) {
              // Skip Trakt-only recommendations when API is down
              console.warn(`Skipping Trakt-only recommendation ${rec.trakt_id} - API unavailable`);
              return null;
            } else {
              // Trakt-only show with enrichment
              try {
                const { showEnrichmentManager } = await import('@/services/showEnrichment');
                const traktShow = await getShowDetails(rec.trakt_id);
                const enrichedData = await showEnrichmentManager.enrichShow(traktShow);

                // Add end_year to traktShow object
                const enrichedTraktShow = {
                  ...traktShow,
                  end_year: enrichedData.endYear
                };

                return {
                  show: mapTraktShowToShow(enrichedTraktShow, {
                    posterUrl: enrichedData.posterUrl,
                    totalSeasons: enrichedData.totalSeasons,
                    totalEpisodes: traktShow.aired_episodes,
                    endYear: enrichedData.endYear
                  }),
                  traktShow: enrichedTraktShow,
                  traktId: rec.trakt_id,
                  isDatabaseBacked: false
                };
              } catch (error) {
                console.warn(`Failed to fetch Trakt show ${rec.trakt_id}`);
                return null;
              }
            }
          })
        );

        const validShows = convertedShows.filter(s => s !== null);
        
        // CRITICAL SECURITY: Prevent cross-user contamination - only commit if requester is still the current user
        if (currentAuthUserIdRef.current !== requestUserId) {
          console.warn('⚠️ User changed during recommendation fetch (was:', requestUserId, 'now:', currentAuthUserIdRef.current, '), discarding results');
          return;
        }
        
        // Always update timestamp, even for empty results, to enable cache reuse logic
        const timestamp = Date.now();
        const cacheInfo = { timestamp, version: CACHE_VERSION };
        if (validShows.length > 0) {
          setCachedRecommendations(validShows);
          setLastRecommendationFetch(cacheInfo);
          lastRecommendationFetchRef.current = cacheInfo;
          console.log(`✅ Cached ${validShows.length} enriched recommendations for instant display`);
        } else {
          // Empty results: still update timestamp to prevent re-fetching immediately
          setLastRecommendationFetch(cacheInfo);
          lastRecommendationFetchRef.current = cacheInfo;
          console.warn('⚠️ No valid recommendations - marked as fetched to prevent retry storm');
        }
      } catch (error) {
        console.error('❌ Failed to load recommendations:', error);
        // Only reset cache on error if requester is still the current user
        if (currentAuthUserIdRef.current === requestUserId) {
          setCachedRecommendations([]);
          setLastRecommendationFetch(null);
          lastRecommendationFetchRef.current = null;
        }
      } finally {
        setIsLoadingRecommendations(false);
        loadRecommendationsRef.current = null;
      }
    })();

    loadRecommendationsRef.current = loadPromise;
    return loadPromise;
  }, [authUserId]);

  const markRecommendationsStale = useCallback(() => {
    setLastRecommendationFetch(null);
    lastRecommendationFetchRef.current = null;
    console.log('📊 Marked recommendations as stale - will refresh on next load');
  }, []);

  // Preload recommendations once when user authenticates, clear on logout
  useEffect(() => {
    if (authUserId && authUserId !== hasPreloadedForUserRef.current) {
      console.log('📊 New user authenticated, preloading recommendations...');
      // Only clear cache if switching to a DIFFERENT user (prevent race condition)
      if (hasPreloadedForUserRef.current !== null && hasPreloadedForUserRef.current !== authUserId) {
        console.log('📊 Different user - clearing previous recommendations');
        setCachedRecommendations([]);
        setLastRecommendationFetch(null);
        lastRecommendationFetchRef.current = null;
      }
      hasPreloadedForUserRef.current = authUserId;
      loadRecommendations({ force: false });
    } else if (!authUserId && authReady) {
      // User logged out - reset recommendation cache and metadata
      // Only clear if authReady to prevent false logout during initialization
      console.log('📊 User logged out, clearing recommendation cache...');
      setCachedRecommendations([]);
      setLastRecommendationFetch(null);
      lastRecommendationFetchRef.current = null;
      hasPreloadedForUserRef.current = null;
    }
  }, [authUserId, authReady, loadRecommendations]);

  const loadUserProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    try {
      // Fetch profiles and social links in parallel
      const [profilesResult, socialLinksResult] = await Promise.all([
        supabase
          .from('profiles' as any)
          .select('*')
          .in('user_id', userIds),
        supabase
          .from('social_links' as any)
          .select('*')
          .in('user_id', userIds)
      ]);

      if (profilesResult.error) {
        console.error('Error batch-loading user profiles:', profilesResult.error);
        return;
      }

      if (profilesResult.data) {
        // Group social links by user_id
        const socialLinksByUser: Record<string, SocialLink[]> = {};
        if (socialLinksResult.data) {
          socialLinksResult.data.forEach((link: any) => {
            if (!socialLinksByUser[link.user_id]) {
              socialLinksByUser[link.user_id] = [];
            }
            socialLinksByUser[link.user_id].push({
              platform: link.platform,
              url: link.url,
            });
          });
        }

        const newProfiles: Record<string, User> = {};
        profilesResult.data.forEach((profile: any) => {
          // Generate avatar data URI if no uploaded avatar but has auto-generated avatar config
          let avatarUrl = profile.avatar_url || '';
          if (!avatarUrl && profile.avatar_color_scheme && profile.avatar_icon) {
            avatarUrl = generateAvatarDataURI(profile.avatar_color_scheme, profile.avatar_icon);
          }
          
          newProfiles[profile.user_id] = {
            id: profile.user_id,
            username: profile.username || 'user',
            displayName: profile.display_name || profile.username || 'User',
            avatar: avatarUrl,
            bio: profile.bio || '',
            socialLinks: socialLinksByUser[profile.user_id] || [],
            following: [],
            followers: [],
          };
        });
        
        setUserProfileCache(prev => ({ ...prev, ...newProfiles }));
      }
    } catch (error) {
      console.error('Error batch-loading user profiles:', error);
    }
  }, [isHydrated]);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user === undefined) return;

    if (user) {
      console.log('✅ User authenticated - loading real profile data:', user.id);
      setAuthUserId(user.id);
      currentAuthUserIdRef.current = user.id; // Update ref immediately for contamination check
      loadCurrentUserProfile(user.id);
      loadFollowDataFromSupabase(user.id);
      loadRecommendations({ userId: user.id }); // Pass user.id directly to avoid race condition
    } else if (authReady) {
      // Only clear data if authReady to prevent false logout during initialization
      console.log('⚠️ User signed out - clearing all data');
      setAuthUserId(null);
      currentAuthUserIdRef.current = null; // Clear ref immediately
      setCurrentUserData(EMPTY_USER);
      setUserData({
        following: [],
        followers: [],
      });
      setPosts([]);
      setReposts([]);
      setPlaylists([]);
      setUserProfileCache({});
      setCachedRecommendations([]); // Clear cached recommendations
      setLastRecommendationFetch(null);
    }
  }, [user, authReady, profileRefreshKey, loadCurrentUserProfile, loadFollowDataFromSupabase, loadRecommendations]);

  useEffect(() => {
    const repostUserIds = reposts.map(r => r.userId);
    const postAuthorIds = posts.map(p => p.user.id);
    const allUserIds = [...repostUserIds, ...postAuthorIds];
    
    const missingUserIds = allUserIds.filter(userId => !userProfileCache[userId]);
    const uniqueIds = Array.from(new Set(missingUserIds));
    
    if (uniqueIds.length > 0) {
      loadUserProfiles(uniqueIds);
    }
  }, [posts, reposts, userProfileCache, loadUserProfiles]);

  const saveRepostsToStorage = async (reposts: RepostData[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REPOSTS, JSON.stringify(reposts));
    } catch (error) {
      console.error('Error saving reposts:', error);
    }
  };

  const createPlaylist = useCallback(async (name: string, showId?: string): Promise<Playlist> => {
    try {
      console.log('📝 Creating playlist:', name);

      // Defensive validation: If showId is provided, ensure it's a valid UUID
      if (showId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(showId)) {
          const errorMsg = `Invalid show ID format: "${showId}". Expected UUID, got Trakt ID or corrupted data. ` +
            `Please use ensureShowUuid() to convert to database UUID before calling createPlaylist.`;
          console.error('❌', errorMsg);
          throw new Error(errorMsg);
        }
      }

      // Check if user is authenticated
      if (!authUserId) {
        console.log('⚠️ No authenticated user - creating local-only playlist');
        
        // Create local-only playlist
        const newPlaylist: Playlist = {
          id: `playlist_${Date.now()}`,
          name,
          userId: currentUser.id,
          shows: showId ? [showId] : [],
          showCount: showId ? 1 : 0,
          isPublic: true,
          createdAt: new Date(),
        };

        const updatedPlaylists = [...playlists, newPlaylist];
        setPlaylists(updatedPlaylists);
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));

        Alert.alert(
          'Playlist Created Locally',
          'Your playlist was saved locally. To sync across devices, please log in.'
        );

        return newPlaylist;
      }

      // Create in Supabase
      console.log('💾 Saving playlist to Supabase...');
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: authUserId,
          name,
          is_public: true,
          show_count: showId ? 1 : 0,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating playlist in Supabase:', error);
        throw new Error(`Failed to create playlist: ${error.message}`);
      }

      console.log('✅ Playlist created in Supabase:', data.id);

      // Add show to playlist if provided
      if (showId && data) {
        const { error: showError } = await supabase
          .from('playlist_shows')
          .insert({
            playlist_id: data.id,
            show_id: showId,
          });

        if (showError) {
          console.error('❌ Error adding show to playlist:', showError);
        } else {
          console.log('✅ Show added to playlist');
        }
      }

      const newPlaylist: Playlist = {
        id: data.id,
        name: data.name,
        userId: data.user_id,
        shows: showId ? [showId] : [],
        showCount: showId ? 1 : 0,
        isPublic: data.is_public,
        createdAt: new Date(data.created_at),
      };

      setPlaylists(prev => [...prev, newPlaylist]);
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify([...playlists, newPlaylist]));

      return newPlaylist;
    } catch (error) {
      console.error('❌ Error creating playlist:', error);
      throw error;
    }
  }, [playlists, currentUser.id, authUserId]);

  const addShowToPlaylist = useCallback(async (playlistId: string, showId: string, traktId?: number) => {
    try {
      console.log('📝 Adding show to playlist:', playlistId, showId);

      // Defensive validation: Ensure showId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(showId)) {
        const errorMsg = `Invalid show ID format: "${showId}". Expected UUID, got Trakt ID or corrupted data. ` +
          `Please use ensureShowUuid() to convert to database UUID before calling addShowToPlaylist.`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      // Record Trakt ID -> UUID mapping BEFORE optimistic update for immediate bookmark state
      if (traktId) {
        recordTraktIdMapping(traktId, showId);
      }

      // OPTIMISTIC UPDATE FIRST - Update UI immediately for instant feedback
      setPlaylists(prev => {
        const updated = prev.map(p => 
          p.id === playlistId 
            ? { ...p, shows: [...(p.shows || []), showId], showCount: (p.shows?.length || 0) + 1 }
            : p
        );
        
        // Persist to AsyncStorage (fire-and-forget with error handling)
        AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updated))
          .catch(error => console.error('❌ Error saving playlists to AsyncStorage:', error));
        
        return updated;
      });

      // THEN persist to database (if authenticated)
      if (authUserId) {
        const { error } = await supabase
          .from('playlist_shows')
          .insert({
            playlist_id: playlistId,
            show_id: showId,
          });

        if (error) {
          console.error('❌ Error adding show to playlist in Supabase:', error);
          // Rollback optimistic update on error
          setPlaylists(prev => {
            const reverted = prev.map(p => 
              p.id === playlistId 
                ? { ...p, shows: (p.shows || []).filter(id => id !== showId), showCount: Math.max(0, (p.showCount || 0) - 1) }
                : p
            );
            // Persist rollback to AsyncStorage
            AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(reverted))
              .catch(err => console.error('❌ Error saving rolled-back playlists to AsyncStorage:', err));
            return reverted;
          });
          throw new Error(`Failed to add show: ${error.message}`);
        }

        const { data: currentPlaylist } = await supabase
          .from('playlists')
          .select('show_count')
          .eq('id', playlistId)
          .single();
        
        if (currentPlaylist) {
          await supabase
            .from('playlists')
            .update({ show_count: currentPlaylist.show_count + 1 })
            .eq('id', playlistId);
        }

        console.log('✅ Show added to playlist in Supabase');
      }
    } catch (error) {
      console.error('❌ Error adding show to playlist:', error);
      throw error;
    }
  }, [playlists, authUserId]);

  const removeShowFromPlaylist = useCallback(async (playlistId: string, showId: string) => {
    try {
      console.log('📝 Removing show from playlist:', playlistId, showId);

      if (authUserId) {
        // First verify ownership of the playlist
        const { data: playlist, error: fetchError } = await supabase
          .from('playlists')
          .select('user_id')
          .eq('id', playlistId)
          .eq('user_id', authUserId)
          .single();

        if (fetchError || !playlist) {
          console.error('❌ Playlist not found or not owned by user:', fetchError);
          throw new Error('You do not have permission to modify this playlist');
        }

        const { error } = await supabase
          .from('playlist_shows')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('show_id', showId);

        if (error) {
          console.error('❌ Error removing show from playlist in Supabase:', error);
          throw new Error(`Failed to remove show: ${error.message}`);
        }

        const { data: currentPlaylist } = await supabase
          .from('playlists')
          .select('show_count')
          .eq('id', playlistId)
          .single();
        
        if (currentPlaylist) {
          await supabase
            .from('playlists')
            .update({ show_count: Math.max(0, currentPlaylist.show_count - 1) })
            .eq('id', playlistId)
            .eq('user_id', authUserId);
        }

        console.log('✅ Show removed from playlist in Supabase');
      }

      // Update local state
      setPlaylists(prev => {
        const updatedPlaylists = prev.map(p => {
          if (p.id === playlistId) {
            const newShows = (p.shows || []).filter(id => id !== showId);
            return { ...p, shows: newShows, showCount: newShows.length };
          }
          return p;
        });
        AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
        return updatedPlaylists;
      });
    } catch (error) {
      console.error('❌ Error removing show from playlist:', error);
      throw error;
    }
  }, [authUserId]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    try {
      console.log('📝 Deleting playlist:', playlistId);

      if (authUserId) {
        const { error } = await supabase
          .from('playlists')
          .delete()
          .eq('id', playlistId)
          .eq('user_id', authUserId);

        if (error) {
          console.error('❌ Error deleting playlist in Supabase:', error);
          throw new Error(`Failed to delete playlist: ${error.message}`);
        }

        console.log('✅ Playlist deleted from Supabase');
      }

      // Update local state
      setPlaylists(prev => {
        const updatedPlaylists = prev.filter(p => p.id !== playlistId);
        AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
        return updatedPlaylists;
      });
    } catch (error) {
      console.error('❌ Error deleting playlist:', error);
      throw error;
    }
  }, [authUserId]);

  const updatePlaylistPrivacy = useCallback(async (playlistId: string, isPublic: boolean) => {
    try {
      console.log('📝 Updating playlist privacy:', playlistId, isPublic);

      if (authUserId) {
        const { error } = await supabase
          .from('playlists')
          .update({ is_public: isPublic })
          .eq('id', playlistId);

        if (error) {
          console.error('❌ Error updating playlist privacy in Supabase:', error);
          throw new Error(`Failed to update privacy: ${error.message}`);
        }

        console.log('✅ Playlist privacy updated in Supabase');
      }

      // Update local state
      setPlaylists(prev => {
        const updatedPlaylists = prev.map(p => 
          p.id === playlistId 
            ? { ...p, isPublic }
            : p
        );
        AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
        return updatedPlaylists;
      });
    } catch (error) {
      console.error('❌ Error updating playlist privacy:', error);
      throw error;
    }
  }, [authUserId]);

  const recordTraktIdMapping = useCallback((traktId: number, uuid: string) => {
    setTraktIdToUuidMap(prev => {
      const newMap = new Map(prev);
      newMap.set(traktId, uuid);
      console.log(`🔗 Recorded Trakt ID ${traktId} -> UUID ${uuid}`);
      
      // Persist to AsyncStorage
      const mapObject = Object.fromEntries(newMap);
      AsyncStorage.setItem(STORAGE_KEYS.TRAKT_ID_MAP, JSON.stringify(mapObject))
        .catch(error => console.error('❌ Error saving Trakt ID map to AsyncStorage:', error));
      
      return newMap;
    });
  }, []);

  const ensureShowUuid = useCallback(async (show: Show, traktShow?: any): Promise<string> => {
    // Ensure show has an ID - use Trakt ID as fallback
    const showId = show.id || `trakt-${show.traktId}`;
    
    // If already a UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(showId)) {
      console.log(`✅ Show ${show.title} already has UUID: ${showId}`);
      return showId;
    }

    // Extract Trakt ID from trakt-{number} format or use show.traktId directly
    let traktId: number;
    if (showId.startsWith('trakt-')) {
      traktId = parseInt(showId.substring(6));
    } else if (show.traktId) {
      traktId = show.traktId;
    } else {
      throw new Error(`Cannot resolve UUID: show "${show.title}" has no ID or Trakt ID`);
    }

    console.log(`🔄 Resolving Trakt ID ${traktId} to UUID for "${show.title}"...`);

    // Check cache first
    const cachedUuid = traktIdToUuidMap.get(traktId);
    if (cachedUuid) {
      // Verify the cached UUID actually exists in the database
      try {
        const { getShowById } = await import('@/services/showDatabase');
        const existingShow = await getShowById(cachedUuid);
        if (existingShow) {
          console.log(`✅ Found cached UUID for Trakt ID ${traktId}: ${cachedUuid}`);
          return cachedUuid;
        } else {
          console.log(`⚠️ Cached UUID ${cachedUuid} no longer exists in database, will recreate show`);
          // Clear the stale cache entry
          setTraktIdToUuidMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.delete(traktId);
            return newMap;
          });
        }
      } catch (error) {
        console.log(`⚠️ Error verifying cached UUID, will recreate show:`, error);
      }
    }

    // Not in cache or cache is stale - need to save to database
    console.log(`💾 Saving show "${show.title}" to database to get UUID...`);
    
    try {
      const { upsertShowFromAppModel } = await import('@/services/showDatabase');
      const { getShowDetails } = await import('@/services/trakt');
      const { showEnrichmentManager } = await import('@/services/showEnrichment');

      // Fetch full Trakt data if not provided
      let fullTraktShow = traktShow;
      if (!fullTraktShow) {
        console.log(`📡 Fetching Trakt data for ID ${traktId}...`);
        fullTraktShow = await getShowDetails(traktId);
      }

      // Enrich with poster if needed
      let posterUrl = show.poster;
      if (!posterUrl) {
        try {
          const enrichedData = await showEnrichmentManager.enrichShow(fullTraktShow);
          posterUrl = enrichedData.posterUrl;
        } catch (error) {
          console.warn(`Failed to enrich poster for ${show.title}`);
        }
      }

      // Save to database
      const dbShow = await upsertShowFromAppModel({
        traktId: traktId,
        title: show.title,
        description: show.description || '',
        posterUrl: posterUrl,
        backdropUrl: show.backdrop || null,
        rating: show.rating || 0,
        totalSeasons: show.totalSeasons || 0,
        totalEpisodes: show.totalEpisodes || 0,
      });

      const uuid = dbShow.id;
      console.log(`✅ Saved show "${show.title}" to database with UUID: ${uuid}`);

      // Record mapping
      recordTraktIdMapping(traktId, uuid);

      return uuid;
    } catch (error) {
      console.error(`❌ Failed to save show "${show.title}" to database:`, error);
      throw new Error(`Failed to resolve show UUID: ${error}`);
    }
  }, [traktIdToUuidMap, recordTraktIdMapping]);

  const isShowInPlaylist = useCallback((playlistId: string, showId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return false;
    
    // Check by UUID directly
    if ((playlist.shows || []).includes(showId)) {
      return true;
    }
    
    // If showId is in "trakt-{id}" format, resolve to UUID and check again
    if (showId.startsWith('trakt-')) {
      const traktId = parseInt(showId.substring(6));
      const uuid = traktIdToUuidMap.get(traktId);
      if (uuid && (playlist.shows || []).includes(uuid)) {
        return true;
      }
    }
    
    return false;
  }, [playlists, traktIdToUuidMap]);

  const loadPlaylists = useCallback(async (userId?: string) => {
    try {
      console.log('📝 Loading playlists for user:', userId || authUserId);

      // If user is authenticated, load from Supabase
      if (authUserId) {
        const targetUserId = userId || authUserId;

        const { data, error } = await supabase
          .from('playlists')
          .select(`
            *,
            playlist_shows (
              show_id
            )
          `)
          .eq('user_id', targetUserId);

        if (error) {
          console.error('❌ Error loading playlists from Supabase:', error);
        } else if (data) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const loadedPlaylists: Playlist[] = data.map(p => {
            const shows = p.playlist_shows.map((ps: any) => ps.show_id);
            // Filter out invalid show IDs (corrupted data like "trakt-191758")
            const validShows = shows.filter((id: string) => uuidRegex.test(id));
            return {
              id: p.id,
              name: p.name,
              userId: p.user_id,
              shows: validShows,
              showCount: validShows.length,
              isPublic: p.is_public,
              createdAt: new Date(p.created_at),
            };
          });

          console.log('✅ Loaded', loadedPlaylists.length, 'playlists from Supabase');
          setPlaylists(loadedPlaylists);
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(loadedPlaylists));
          
          // Populate traktId -> UUID mapping from playlist shows
          const allShowIds = new Set<string>();
          for (const playlist of loadedPlaylists) {
            for (const showId of playlist.shows || []) {
              allShowIds.add(showId);
            }
          }
          
          if (allShowIds.size > 0) {
            const { data: shows } = await supabase
              .from('shows')
              .select('id, trakt_id')
              .in('id', Array.from(allShowIds));
            
            if (shows) {
              // Merge with existing map to preserve locally cached entries
              setTraktIdToUuidMap(prev => {
                const mergedMap = new Map(prev);
                for (const show of shows) {
                  if (show.trakt_id) {
                    mergedMap.set(show.trakt_id, show.id);
                  }
                }
                console.log(`✅ Merged ${shows.length} Trakt ID -> UUID mappings (total: ${mergedMap.size})`);
                
                // Persist merged map to AsyncStorage
                const mapObject = Object.fromEntries(mergedMap);
                AsyncStorage.setItem(STORAGE_KEYS.TRAKT_ID_MAP, JSON.stringify(mapObject))
                  .catch(error => console.error('❌ Error saving Trakt ID map to AsyncStorage:', error));
                
                return mergedMap;
              });
            }
          }
          
          return;
        }
      }

      // Fallback to local storage
      console.log('⚠️ Loading playlists from local storage');
      const playlistsData = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (playlistsData) {
        const parsedPlaylists = JSON.parse(playlistsData);
        setPlaylists(parsedPlaylists.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        })));
      }
    } catch (error) {
      console.error('❌ Error loading playlists:', error);
    }
  }, [authUserId]);

  const loadPosts = useCallback(async () => {
    try {
      console.log('📝 Loading posts from Supabase...');

      // If user is authenticated, load from Supabase
      if (authUserId) {
        // Step 1: Load recent posts (limit for scalability)
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100); // Only load most recent 100 posts for feed

        if (postsError) {
          console.error('❌ Error loading posts from Supabase:', postsError);
          return;
        }

        if (!postsData || postsData.length === 0) {
          console.log('📭 No posts found in Supabase');
          setPosts([]);
          return;
        }

        console.log('✅ Loaded', postsData.length, 'posts from Supabase');
        
        // Debug: Log raw post data to check rewatch_episode_ids
        postsData.forEach((p: any) => {
          if (p.rewatch_episode_ids?.length > 0 || p.episode_ids?.length > 0) {
            console.log('📦 Raw post from DB:', {
              id: p.id,
              episode_ids: p.episode_ids,
              rewatch_episode_ids: p.rewatch_episode_ids,
              hasRewatchColumn: 'rewatch_episode_ids' in p,
            });
          }
        });

        // Step 2: Extract unique IDs for batch fetching
        const postIds = postsData.map((p: any) => p.id);
        let uniqueUserIds = [...new Set(postsData.map((p: any) => p.user_id))];
        const uniqueShowIds = [...new Set(postsData.map((p: any) => p.show_id))];
        // Include BOTH episode_ids AND rewatch_episode_ids to ensure rewatch episodes get hydrated
        const allEpisodeIds = [...new Set(postsData.flatMap((p: any) => [
          ...(p.episode_ids || []),
          ...(p.rewatch_episode_ids || [])
        ]))];

        // Fetch reposts first to get reposter user IDs
        const { data: repostsData } = await supabase
          .from('post_reposts')
          .select('post_id, user_id, created_at')
          .in('post_id', postIds);
        
        // Add reposter user IDs to the batch
        if (repostsData) {
          const reposterUserIds = repostsData.map((r: any) => r.user_id);
          uniqueUserIds = [...new Set([...uniqueUserIds, ...reposterUserIds])];
        }

        // Step 3: Batch fetch all related data (scoped to these 100 posts)
        const [usersResult, showsResult, episodesResult, likesResult, userLikesResult] = await Promise.all([
          // Fetch all user profiles
          supabase.from('profiles' as any).select('*').in('user_id', uniqueUserIds),
          // Fetch all shows
          supabase.from('shows').select('*').in('id', uniqueShowIds),
          // Fetch all episodes
          allEpisodeIds.length > 0 ? supabase.from('episodes').select('*').in('id', allEpisodeIds) : { data: [] },
          // Fetch likes ONLY for these posts
          supabase.from('post_likes').select('post_id').in('post_id', postIds),
          // Fetch current user's likes ONLY for these posts
          supabase.from('post_likes').select('post_id').eq('user_id', authUserId).in('post_id', postIds),
        ]);
        
        // Comments removed - no comments table in schema, count stored in posts.comments column
        const commentsResult = { data: [] };
        
        // Use pre-fetched repost data
        const repostsResult = { data: repostsData };

        // Step 4: Build lookup maps
        const usersMap = new Map();
        
        // Check for errors in user profiles fetch
        if (usersResult.error) {
          console.error('❌ Error fetching user profiles:', usersResult.error);
        }
        
        (usersResult.data || []).forEach((profile: any) => {
          let avatarUrl = profile.avatar_url || '';
          if (!avatarUrl && profile.avatar_color_scheme && profile.avatar_icon) {
            avatarUrl = generateAvatarDataURI(profile.avatar_color_scheme, profile.avatar_icon);
          }
          usersMap.set(profile.user_id, {
            id: profile.user_id,
            username: profile.username || 'user',
            displayName: profile.display_name || profile.username || 'User',
            avatar: avatarUrl,
            bio: profile.bio || '',
            socialLinks: [],
            following: [],
            followers: [],
          });
        });
        
        // Fetch missing profiles individually (fallback for missing profiles)
        const missingUserIds = uniqueUserIds.filter(uid => !usersMap.has(uid));
        if (missingUserIds.length > 0) {
          console.log('🔄 Fetching', missingUserIds.length, 'missing profiles individually...');
          const missingProfilesResults = await Promise.all(
            missingUserIds.map(userId =>
              supabase
                .from('profiles' as any)
                .select('*')
                .eq('user_id', userId)
                .single()
            )
          );
          
          missingProfilesResults.forEach(({ data: profileData, error }) => {
            if (error) {
              console.error('❌ Error fetching individual profile:', error);
              return;
            }
            
            if (profileData) {
              let avatarUrl = profileData.avatar_url || '';
              if (!avatarUrl && profileData.avatar_color_scheme && profileData.avatar_icon) {
                avatarUrl = generateAvatarDataURI(profileData.avatar_color_scheme, profileData.avatar_icon);
              }
              usersMap.set(profileData.user_id, {
                id: profileData.user_id,
                username: profileData.username || 'user',
                displayName: profileData.display_name || profileData.username || 'User',
                avatar: avatarUrl,
                bio: profileData.bio || '',
                socialLinks: [],
                following: [],
                followers: [],
              });
              console.log('✅ Fetched missing profile:', profileData.username);
            }
          });
        }

        const showsMap = new Map();
        (showsResult.data || []).forEach((show: any) => {
          console.log('📺 Show from DB:', { id: show.id, title: show.title, trakt_id: show.trakt_id, color_scheme: show.color_scheme });
          showsMap.set(show.id, show);
        });

        const episodesMap = new Map();
        console.log('🎬 Episodes query result:', { 
          count: (episodesResult.data || []).length,
          requestedIds: allEpisodeIds.length,
          error: (episodesResult as any).error
        });
        (episodesResult.data || []).forEach((ep: any) => {
          episodesMap.set(ep.id, {
            id: ep.id,
            showId: ep.show_id,
            seasonNumber: ep.season_number,
            episodeNumber: ep.episode_number,
            title: ep.title,
            description: ep.description || '',
            rating: ep.rating || 0,
            postCount: 0,
            thumbnail: ep.thumbnail_url || undefined,
          });
        });

        // Count likes, reposts, comments per post
        const likesCount = new Map();
        (likesResult.data || []).forEach((like: any) => {
          likesCount.set(like.post_id, (likesCount.get(like.post_id) || 0) + 1);
        });

        const repostsCount = new Map();
        (repostsResult.data || []).forEach((repost: any) => {
          repostsCount.set(repost.post_id, (repostsCount.get(repost.post_id) || 0) + 1);
        });
        
        // Update reposts state with full metadata
        const repostDataArray: RepostData[] = (repostsResult.data || []).map((r: any) => ({
          postId: r.post_id,
          userId: r.user_id,
          timestamp: new Date(r.created_at),
        }));
        setReposts(repostDataArray);

        const commentsCount = new Map();
        (commentsResult.data || []).forEach((comment: any) => {
          commentsCount.set(comment.post_id, (commentsCount.get(comment.post_id) || 0) + 1);
        });

        const userLikesSet = new Set((userLikesResult.data || []).map((like: any) => like.post_id));

        // Step 5: Transform posts
        const loadedPosts: Post[] = postsData.map((dbPost: any) => {
          const authorProfile = usersMap.get(dbPost.user_id) || {
            id: dbPost.user_id,
            username: 'unknown',
            displayName: 'Unknown User',
            avatar: '',
            bio: '',
            socialLinks: [],
            following: [],
            followers: [],
          };

          const showData = showsMap.get(dbPost.show_id);
          
          if (!showData) {
            console.log('⚠️ Post missing show data:', { postId: dbPost.id, showId: dbPost.show_id, showTitle: dbPost.show_title });
          } else if (!showData.trakt_id) {
            console.log('⚠️ Show missing trakt_id:', { showId: showData.id, showTitle: showData.title, hasColorScheme: !!showData.color_scheme });
          }
          
          // Map episode IDs to episodes in original order
          const episodes = (dbPost.episode_ids || [])
            .map((id: string) => episodesMap.get(id))
            .filter((ep: any) => ep !== undefined);
          
          // Debug: Log episode hydration
          if (dbPost.rewatch_episode_ids?.length > 0) {
            console.log('🔄 Rewatch post found:', {
              postId: dbPost.id,
              episodeIds: dbPost.episode_ids,
              rewatchIds: dbPost.rewatch_episode_ids,
              hydratedCount: episodes.length,
              hydratedIds: episodes.map((e: any) => e.id)
            });
          }

          return {
            id: dbPost.id,
            user: authorProfile,
            show: {
              id: dbPost.show_id,
              title: dbPost.show_title || showData?.title || 'Unknown Show',
              poster: dbPost.show_poster || showData?.poster_url || null,
              backdrop: showData?.backdrop_url || null,
              description: showData?.description || '',
              rating: showData?.rating || 0,
              totalSeasons: showData?.total_seasons || 0,
              totalEpisodes: showData?.total_episodes || 0,
              friendsWatching: 0,
              traktId: showData?.trakt_id,
              colorScheme: showData?.color_scheme || null,
              year: showData?.year,
            },
            episodes: episodes.length > 0 ? episodes : undefined,
            episode: episodes.length > 0 ? episodes[0] : undefined,
            rewatchEpisodeIds: dbPost.rewatch_episode_ids || [],
            title: dbPost.title || undefined,
            body: dbPost.body || '',
            timestamp: new Date(dbPost.created_at),
            likes: likesCount.get(dbPost.id) || 0,
            comments: commentsCount.get(dbPost.id) || 0,
            reposts: repostsCount.get(dbPost.id) || 0,
            isLiked: userLikesSet.has(dbPost.id),
            rating: dbPost.rating || undefined,
            tags: dbPost.tags || [],
            isSpoiler: (dbPost.tags || []).some((tag: string) => tag.toLowerCase().includes('spoiler')),
          };
        });

        console.log('✅ Transformed', loadedPosts.length, 'posts successfully');
        setPosts(loadedPosts);
        if (isHydrated) {
          await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(loadedPosts));
        }
      } else {
        // Fallback to local storage if not authenticated
        console.log('⚠️ Loading posts from local storage');
        const postsData = await AsyncStorage.getItem(STORAGE_KEYS.POSTS);
        if (postsData) {
          const parsedPosts = JSON.parse(postsData);
          setPosts(parsedPosts.map((p: any) => ({
            ...p,
            timestamp: new Date(p.timestamp),
          })));
        }
      }
    } catch (error) {
      console.error('❌ Error loading posts:', error);
    }
  }, [authUserId]);

  const loadReportedPosts = useCallback(async () => {
    if (!authUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('post_reports')
        .select('post_id')
        .eq('reporter_id', authUserId);
      
      if (error) {
        console.error('Error loading reported posts:', error);
        return;
      }
      
      if (data) {
        const reportedIds = new Set(data.map(r => r.post_id));
        setReportedPostIds(reportedIds);
      }
    } catch (error) {
      console.error('Error loading reported posts:', error);
    }
  }, [authUserId]);

  const hasUserReportedPost = useCallback((postId: string): boolean => {
    return reportedPostIds.has(postId);
  }, [reportedPostIds]);

  const unreportPost = useCallback(async (postId: string) => {
    if (!authUserId) return;
    
    try {
      const { error } = await supabase
        .from('post_reports')
        .delete()
        .eq('reporter_id', authUserId)
        .eq('post_id', postId);
      
      if (error) {
        console.error('Error unreporting post:', error);
        return;
      }
      
      setReportedPostIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } catch (error) {
      console.error('Error unreporting post:', error);
    }
  }, [authUserId]);

  // Load posts and playlists when authUserId is set
  useEffect(() => {
    if (authUserId) {
      loadPosts();
      loadPlaylists();
      loadReportedPosts();
    }
  }, [authUserId, loadPosts, loadPlaylists, loadReportedPosts]);

  const createPost = useCallback(async (postData: CreatePostData): Promise<Post> => {
    const { skipRating, ...postWithoutSkipRating } = postData;
    // Create temporary post with fake ID for optimistic UI
    const tempId = `post_${Date.now()}`;
    const tempPost: Post = {
      ...postWithoutSkipRating,
      id: tempId,
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      reposts: 0,
      isLiked: false,
    };

    // Optimistically add to UI immediately
    setPosts(prev => {
      const updatedPosts = [tempPost, ...prev];
      if (isHydrated) {
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      }
      return updatedPosts;
    });

    // Try to save to Supabase and get real UUID
    try {
      console.log('📝 Attempting to save post to Supabase...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ AUTH ERROR:', authError);
        throw authError;
      }
      
      if (!user) {
        console.error('❌ POST SAVE FAILED: No authenticated user');
        throw new Error('Not authenticated');
      }

      console.log('✅ User authenticated:', user.id);
      
      // Check rate limit before creating post
      const rateLimitResult = await checkRateLimit(user.id, 'post');
      if (!rateLimitResult.allowed) {
        // Revert optimistic update
        setPosts(prev => prev.filter(p => p.id !== tempId));
        Alert.alert('Rate Limit', rateLimitResult.error || 'You\'ve created too many posts recently. Please wait before posting again.');
        throw new Error('Rate limited');
      }
      
      const episodeIds = postData.episodes?.map(ep => ep.id) || [];
      const rewatchEpisodeIds = postData.rewatchEpisodeIds || [];
      
      const moderationResult = checkPostForModeration(postData.title, postData.body);
      if (moderationResult.flagged) {
        console.log('⚠️ Post flagged for moderation:', moderationResult.reason);
      }
      
      const insertPayload: Record<string, any> = {
        user_id: user.id,
        show_id: postData.show.id,
        show_title: postData.show.title,
        show_poster: postData.show.poster || '',
        episode_ids: episodeIds,
        rewatch_episode_ids: rewatchEpisodeIds,
        title: postData.title,
        body: postData.body,
        rating: postData.rating,
        tags: postData.tags,
      };
      
      if (moderationResult.flagged) {
        insertPayload.flagged_for_moderation = true;
        insertPayload.moderation_reason = moderationResult.reason;
        insertPayload.moderation_status = 'pending';
      }

      console.log('📤 Inserting post with payload:', insertPayload);
        
      let { data, error } = await (supabase as any)
        .from('posts')
        .insert(insertPayload)
        .select()
        .single();

      // Handle Supabase schema cache issue for rewatch_episode_ids column
      if (error && error.code === 'PGRST204' && error.message?.includes('rewatch_episode_ids')) {
        console.warn('⚠️ Schema cache issue for rewatch_episode_ids - retrying without it...');
        const { rewatch_episode_ids, ...payloadWithoutRewatch } = insertPayload;
        const retryResult = await supabase
          .from('posts')
          .insert(payloadWithoutRewatch)
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error('❌ FAILED TO SAVE POST TO SUPABASE:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Post payload:', insertPayload);
        throw error;
      }
        
      console.log('✅ Post saved to Supabase successfully:', data.id);
      // Replace temp ID with real Supabase UUID
      const realPost: Post = {
        ...tempPost,
        id: data.id, // Use the UUID from Supabase
      };

      // Update posts array with real UUID
      setPosts(prev => {
        const updatedPosts = prev.map(p => p.id === tempId ? realPost : p);
        if (isHydrated) {
          AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
        }
        return updatedPosts;
      });

      // Log episodes to watch_history with rewatch flag
      if (episodeIds.length > 0) {
        const watchHistoryEntries = episodeIds.map(episodeId => ({
          user_id: user.id,
          show_id: postData.show.id,
          episode_id: episodeId,
          is_rewatch: rewatchEpisodeIds.includes(episodeId),
        }));

        const { error: whError } = await (supabase as any)
          .from('watch_history')
          .insert(watchHistoryEntries);
        
        // Handle schema cache issue for is_rewatch column
        if (whError && whError.code === 'PGRST204' && whError.message?.includes('is_rewatch')) {
          console.warn('⚠️ Schema cache issue for is_rewatch - retrying without it...');
          const entriesWithoutRewatch = episodeIds.map(episodeId => ({
            user_id: user.id,
            show_id: postData.show.id,
            episode_id: episodeId,
          }));
          await supabase.from('watch_history').insert(entriesWithoutRewatch);
        }
      }

      // Update profile stats
      await supabase.rpc('update_user_profile_stats', { user_id: user.id });

      // Mark recommendations as stale since user's watch history changed
      markRecommendationsStale();

      return realPost;
    } catch (error) {
      console.error('❌ Error saving post to Supabase:', error);
    }

    // Return temp post if Supabase failed
    return tempPost;
  }, [markRecommendationsStale]);

  const deletePost = useCallback(async (postId: string) => {
    // Guard against concurrent deletion calls
    if (isDeletingPost) {
      console.log('⚠️ Delete already in progress, ignoring concurrent call');
      return;
    }

    setIsDeletingPost(true);
    console.log('🗑️ Deleting post:', postId);

    // Get the post to backup for potential rollback
    const postToDelete = posts.find(p => p.id === postId);
    if (!postToDelete) {
      console.error('❌ Post not found:', postId);
      Alert.alert('Error', 'Post not found');
      setIsDeletingPost(false);
      return;
    }

    // Backup current state for rollback
    const previousPosts = [...posts];
    const previousReposts = [...reposts];
    const isReposted = reposts.some(r => r.postId === postId);

    // Optimistically update local state
    setPosts(prev => {
      const updatedPosts = prev.filter(p => p.id !== postId);
      if (isHydrated) {
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      }
      return updatedPosts;
    });

    // Remove reposts locally
    setReposts(prev => {
      const updatedReposts = prev.filter(r => r.postId !== postId);
      saveRepostsToStorage(updatedReposts);
      return updatedReposts;
    });

    // Check if this is a local-only post (not synced to Supabase)
    const isLocalOnly = postId.startsWith('post_');
    
    if (isLocalOnly) {
      console.log('✅ Local-only post deleted (not synced to Supabase)');
      setIsDeletingPost(false);
      return;
    }

    // Try to delete from Supabase (only for UUID posts)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('⚠️ No authenticated user - local delete only');
        return;
      }

      // Verify user owns the post
      const { data: postData, error: fetchError } = await supabase
        .from('posts')
        .select('user_id, episode_ids')
        .eq('id', postId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching post:', fetchError);
        throw fetchError;
      }

      if (postData.user_id !== user.id) {
        console.error('❌ User does not own this post');
        throw new Error('You do not have permission to delete this post');
      }

      console.log('📝 Starting cascade deletion from Supabase...');

      // Step 1: Get episode IDs from the post
      const episodeIds = postData.episode_ids || [];
      
      // Step 2: Delete watch_history entries for these episodes (only for this user)
      // Note: We only delete watch history if NO other posts reference these episodes
      if (episodeIds.length > 0) {
        // Check if any other posts by this user reference these episodes
        const { data: otherPosts } = await supabase
          .from('posts')
          .select('id, episode_ids')
          .eq('user_id', user.id)
          .neq('id', postId);

        const otherPostEpisodeIds = new Set<string>();
        otherPosts?.forEach(post => {
          post.episode_ids?.forEach((epId: string) => otherPostEpisodeIds.add(epId));
        });

        // Only delete watch history for episodes not referenced by other posts
        const episodesToRemoveFromHistory = episodeIds.filter(
          (epId: string) => !otherPostEpisodeIds.has(epId)
        );

        if (episodesToRemoveFromHistory.length > 0) {
          console.log('🗑️ Deleting watch history for episodes:', episodesToRemoveFromHistory);
          const { error: watchHistoryError } = await supabase
            .from('watch_history')
            .delete()
            .eq('user_id', user.id)
            .in('episode_id', episodesToRemoveFromHistory);

          if (watchHistoryError) {
            console.error('❌ Error deleting watch history:', watchHistoryError);
            // Continue anyway - this is not critical
          }
        }
      }

      // Step 3: Delete likes referencing this post
      const { error: likesError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId);

      if (likesError) {
        console.error('❌ Error deleting likes:', likesError);
        throw likesError;
      }

      // Step 4: Delete reposts referencing this post
      const { error: repostsError } = await supabase
        .from('post_reposts')
        .delete()
        .eq('post_id', postId);

      if (repostsError) {
        console.error('❌ Error deleting reposts:', repostsError);
        throw repostsError;
      }

      // Step 6: Finally, delete the post itself
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ Error deleting post:', deleteError);
        throw deleteError;
      }

      // Step 7: Update profile stats
      await supabase.rpc('update_user_profile_stats', { user_id: user.id });

      // Mark recommendations as stale since user's watch history changed
      markRecommendationsStale();

      console.log('✅ Post deleted successfully from Supabase');
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      
      // Rollback React state
      console.log('⚠️ Rolling back local state...');
      setPosts(previousPosts);
      if (isReposted) {
        setReposts(previousReposts);
      }
      
      // Rollback AsyncStorage
      if (isHydrated) {
        await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(previousPosts));
        if (isReposted) {
          await AsyncStorage.setItem(STORAGE_KEYS.REPOSTS, JSON.stringify(previousReposts));
        }
      }

      Alert.alert(
        'Error',
        'Failed to delete post. Please try again.',
        [{ text: 'OK' }]
      );
      
      throw error;
    } finally {
      setIsDeletingPost(false);
    }
  }, [posts, reposts, isDeletingPost, markRecommendationsStale]);

  const likePost = useCallback(async (postId: string) => {
    // Capture just this post's previous state for rollback
    let previousLikes = 0;
    let previousIsLiked = false;

    // Optimistic update: Update UI immediately
    setPosts(prev => {
      const updatedPosts = prev.map(post => {
        if (post.id === postId) {
          previousLikes = post.likes;
          previousIsLiked = post.isLiked;
          return { ...post, likes: post.likes + 1, isLiked: true };
        }
        return post;
      });
      if (isHydrated) {
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      }
      return updatedPosts;
    });

    // Save to Supabase in background
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ LIKE FAILED: No authenticated user');
        throw new Error('Not authenticated');
      }

      console.log('💚 Attempting to save like:', { postId, userId: user.id });
      
      // Insert like
      const { data, error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        })
        .select();

      if (error) {
        console.error('❌ LIKE INSERT FAILED:', error);
        throw error;
      }

      console.log('✅ Like saved to Supabase:', data);

      // Get the post owner to update their stats
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postData) {
        // Update profile stats for the post owner
        await supabase.rpc('update_user_profile_stats', { user_id: postData.user_id });
      }
    } catch (error) {
      console.error('❌ Error liking post in Supabase:', error);
      // Rollback only this specific post
      setPosts(prev => {
        const rolledBackPosts = prev.map(post =>
          post.id === postId
            ? { ...post, likes: previousLikes, isLiked: previousIsLiked }
            : post
        );
        if (isHydrated) {
          AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(rolledBackPosts));
        }
        return rolledBackPosts;
      });
    }
  }, [isHydrated]);

  const unlikePost = useCallback(async (postId: string) => {
    // Capture just this post's previous state for rollback
    let previousLikes = 0;
    let previousIsLiked = false;

    // Optimistic update: Update UI immediately
    setPosts(prev => {
      const updatedPosts = prev.map(post => {
        if (post.id === postId) {
          previousLikes = post.likes;
          previousIsLiked = post.isLiked;
          return { ...post, likes: Math.max(0, post.likes - 1), isLiked: false };
        }
        return post;
      });
      if (isHydrated) {
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      }
      return updatedPosts;
    });

    // Remove from Supabase in background
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Delete like
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        // Get the post owner to update their stats
        const { data: postData } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();

        if (postData) {
          // Update profile stats for the post owner
          await supabase.rpc('update_user_profile_stats', { user_id: postData.user_id });
        }
      }
    } catch (error) {
      console.error('Error unliking post in Supabase:', error);
      // Rollback only this specific post
      setPosts(prev => {
        const rolledBackPosts = prev.map(post =>
          post.id === postId
            ? { ...post, likes: previousLikes, isLiked: previousIsLiked }
            : post
        );
        if (isHydrated) {
          AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(rolledBackPosts));
        }
        return rolledBackPosts;
      });
    }
  }, [isHydrated]);

  const repostPost = useCallback(async (postId: string) => {
    const newRepost: RepostData = {
      postId,
      userId: currentUser.id,
      timestamp: new Date(),
    };

    setReposts(prev => {
      const updatedReposts = [...prev, newRepost];
      saveRepostsToStorage(updatedReposts);
      return updatedReposts;
    });

    setPosts(prev => {
      const updatedPosts = prev.map(post =>
        post.id === postId
          ? { ...post, reposts: post.reposts + 1 }
          : post
      );
      if (isHydrated) {
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      }
      return updatedPosts;
    });
  }, [currentUser.id, isHydrated]);

  const unrepostPost = useCallback(async (postId: string) => {
    setReposts(prev => {
      const updatedReposts = prev.filter(
        r => !(r.postId === postId && r.userId === currentUser.id)
      );
      saveRepostsToStorage(updatedReposts);
      return updatedReposts;
    });

    setPosts(prev => {
      const updatedPosts = prev.map(post =>
        post.id === postId
          ? { ...post, reposts: Math.max(0, post.reposts - 1) }
          : post
      );
      if (isHydrated) {
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      }
      return updatedPosts;
    });
  }, [currentUser.id, isHydrated]);

  const hasUserReposted = useCallback((postId: string): boolean => {
    return reposts.some(r => r.postId === postId && r.userId === currentUser.id);
  }, [reposts, currentUser.id]);

  const getUserReposts = useCallback((): Post[] => {
    const userRepostIds = reposts
      .filter(r => r.userId === currentUser.id)
      .map(r => r.postId);
    return posts.filter(p => userRepostIds.includes(p.id));
  }, [posts, reposts, currentUser.id]);

  const allReposts = useMemo(() => {
    return reposts
      .map(repost => {
        const post = posts.find(p => p.id === repost.postId);
        const user = userProfileCache[repost.userId];
        if (!post || !user) return null;
        return {
          post,
          repostedBy: user,
          timestamp: repost.timestamp,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [posts, reposts, userProfileCache]);
  
  const getProfileFeed = useCallback((userId: string): FeedItem[] => {
    const feedItems: FeedItem[] = [];
    
    // Add original posts by this user
    posts.filter(p => p.user.id === userId).forEach(post => {
      feedItems.push({
        post,
        sortTimestamp: post.timestamp,
      });
    });
    
    // Add reposts by this user
    reposts.filter(r => r.userId === userId).forEach(repost => {
      const post = posts.find(p => p.id === repost.postId);
      const reposterUser = userProfileCache[repost.userId];
      if (post && reposterUser) {
        feedItems.push({
          post,
          repostContext: {
            repostedBy: reposterUser,
            repostedAt: repost.timestamp,
            isSelfRepost: post.user.id === repost.userId,
          },
          sortTimestamp: repost.timestamp,
        });
      }
    });
    
    // Sort by sortTimestamp (most recent first)
    return feedItems.sort((a, b) => b.sortTimestamp.getTime() - a.sortTimestamp.getTime());
  }, [posts, reposts, userProfileCache]);
  
  const getHomeFeed = useCallback((): FeedItem[] => {
    // For home feed, just wrap posts without repost context
    // (In the future, this could be enhanced to show reposts from followed users)
    return posts.map(post => ({
      post,
      sortTimestamp: post.timestamp,
    }));
  }, [posts]);

  const updateCommentCount = useCallback(async (postId: string, count: number) => {
    setPosts(prev => {
      // Find the post to check if update is needed
      const existingPost = prev.find(p => p.id === postId);
      
      // Only update if count actually changed (prevent infinite loops)
      if (existingPost && existingPost.comments === count) {
        return prev; // No change needed
      }
      
      const updatedPosts = prev.map(post =>
        post.id === postId
          ? { ...post, comments: count }
          : post
      );
      if (isHydrated) {
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      }
      return updatedPosts;
    });
  }, [isHydrated]);

  const getPost = useCallback((postId: string): Post | undefined => {
    return posts.find(p => p.id === postId);
  }, [posts]);

  const followUser = useCallback(async (userId: string) => {
    console.log('🔵 followUser called for userId:', userId);
    
    try {
      // Check if user is authenticated
      if (!authUserId) {
        console.log('⚠️ No authenticated user - cannot follow');
        Alert.alert(
          'Authentication Required',
          'Please log in to follow users. Your follow will be saved locally for now.',
          [{ text: 'OK' }]
        );
        
        // Update local state only
        setUserData(prev => {
          const updatedUserData = {
            ...prev,
            following: [...prev.following, userId],
          };
          AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
          return updatedUserData;
        });
        return;
      }

      // Check rate limit before following
      const rateLimitResult = await checkRateLimit(authUserId, 'follow');
      if (!rateLimitResult.allowed) {
        Alert.alert('Rate Limit', rateLimitResult.error || 'You\'ve followed too many users recently. Please wait before following more.');
        return;
      }

      // Save to Supabase
      console.log('💾 Saving follow to Supabase...');
      console.log('   follower_id:', authUserId);
      console.log('   following_id:', userId);

      const { data, error } = await supabase
        .from('follows')
        .insert({
          follower_id: authUserId,
          following_id: userId,
        })
        .select();

      if (error) {
        console.error('❌ Error following user in Supabase:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        
        Alert.alert(
          'Follow Failed',
          `Could not follow user: ${error.message}`,
          [{ text: 'OK' }]
        );
        throw error;
      }

      console.log('✅ Follow saved to Supabase:', data);

      // Verify the follow was saved
      const { data: verifyData, error: verifyError } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', authUserId)
        .eq('following_id', userId);

      if (verifyError) {
        console.error('❌ Error verifying follow:', verifyError);
      } else {
        console.log('✅ Follow verified in database:', verifyData);
      }

      // Update local state
      setUserData(prev => {
        const updatedUserData = {
          ...prev,
          following: [...prev.following, userId],
        };
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
        return updatedUserData;
      });

      console.log('✅ Follow completed successfully');
    } catch (error) {
      console.error('❌ Error following user:', error);
      throw error;
    }
  }, [authUserId]);

  const unfollowUser = useCallback(async (userId: string) => {
    console.log('🔴 unfollowUser called for userId:', userId);
    
    try {
      // Check if user is authenticated
      if (!authUserId) {
        console.log('⚠️ No authenticated user - cannot unfollow');
        
        // Update local state only
        setUserData(prev => {
          const updatedUserData = {
            ...prev,
            following: prev.following.filter(id => id !== userId),
          };
          AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
          return updatedUserData;
        });
        return;
      }

      // Remove from Supabase
      console.log('💾 Removing follow from Supabase...');
      console.log('   follower_id:', authUserId);
      console.log('   following_id:', userId);

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', authUserId)
        .eq('following_id', userId);

      if (error) {
        console.error('❌ Error unfollowing user in Supabase:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        
        Alert.alert(
          'Unfollow Failed',
          `Could not unfollow user: ${error.message}`,
          [{ text: 'OK' }]
        );
        throw error;
      }

      console.log('✅ Unfollow removed from Supabase');

      // Verify the unfollow
      const { data: verifyData, error: verifyError } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', authUserId)
        .eq('following_id', userId);

      if (verifyError) {
        console.error('❌ Error verifying unfollow:', verifyError);
      } else {
        console.log('✅ Unfollow verified - records found:', verifyData?.length || 0);
      }

      // Update local state
      setUserData(prev => {
        const updatedUserData = {
          ...prev,
          following: prev.following.filter(id => id !== userId),
        };
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
        return updatedUserData;
      });

      console.log('✅ Unfollow completed successfully');
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      throw error;
    }
  }, [authUserId]);

  const isFollowing = useCallback((userId: string): boolean => {
    return userData.following.includes(userId);
  }, [userData.following]);

  const getFollowers = useCallback(async (userId: string): Promise<User[]> => {
    try {
      console.log('📝 Getting followers for user:', userId);
      
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            user_id,
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        console.log('✅ Loaded', data.length, 'followers from Supabase');
        return data.map((follow: any) => ({
          id: follow.profiles.user_id,
          username: follow.profiles.username,
          displayName: follow.profiles.display_name,
          avatar: follow.profiles.avatar_url || '',
          bio: follow.profiles.bio || '',
          followers: [],
          following: [],
        }));
      }
    } catch (error) {
      console.log('⚠️ Error fetching followers from Supabase:', error);
    }

    return [];
  }, []);

  const getFollowing = useCallback(async (userId: string): Promise<User[]> => {
    try {
      console.log('📝 Getting following for user:', userId);
      
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            user_id,
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        console.log('✅ Loaded', data.length, 'following from Supabase');
        return data.map((follow: any) => ({
          id: follow.profiles.user_id,
          username: follow.profiles.username,
          displayName: follow.profiles.display_name,
          avatar: follow.profiles.avatar_url || '',
          bio: follow.profiles.bio || '',
          followers: [],
          following: [],
        }));
      }
    } catch (error) {
      console.log('⚠️ Error fetching following from Supabase:', error);
    }

    return [];
  }, []);

  const getEpisodesWatchedCount = useCallback(async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('watch_history')
        .select('episode_id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!error && count !== null) {
        return count;
      }
    } catch (error) {
      console.log('Error fetching episodes watched count from Supabase:', error);
    }

    return 0;
  }, []);

  const getTotalLikesReceived = useCallback(async (userId: string): Promise<number> => {
    try {
      // First get all post IDs for this user
      const { data: userPosts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);

      if (postsError || !userPosts || userPosts.length === 0) {
        return 0;
      }

      const postIds = userPosts.map(p => p.id);

      // Count likes on those posts from post_likes table
      const { count, error } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds);

      if (!error && count !== null) {
        return count;
      }
    } catch (error) {
      console.log('Error fetching total likes received from Supabase:', error);
    }

    return 0;
  }, []);

  const getTopFollowers = useCallback(async (userId: string, limit: number = 3): Promise<User[]> => {
    try {
      console.log(`📝 Getting top ${limit} most popular followers for user:`, userId);
      
      // Get all followers first, then sort by follower_count
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            user_id,
            username,
            display_name,
            avatar_url,
            bio,
            follower_count
          )
        `)
        .eq('following_id', userId);

      if (!error && data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} followers from Supabase`);
        // Sort by follower_count and take top N
        const sortedFollowers = data
          .filter((follow: any) => follow.profiles)
          .sort((a: any, b: any) => (b.profiles.follower_count || 0) - (a.profiles.follower_count || 0))
          .slice(0, limit);
        
        return sortedFollowers.map((follow: any) => ({
          id: follow.profiles.user_id,
          username: follow.profiles.username,
          displayName: follow.profiles.display_name,
          avatar: follow.profiles.avatar_url || '',
          bio: follow.profiles.bio || '',
          followers: [],
          following: [],
        }));
      }
    } catch (error) {
      console.log('⚠️ Error fetching top followers from Supabase:', error);
    }

    return [];
  }, []);

  const getTopFollowing = useCallback(async (userId: string, limit: number = 3): Promise<User[]> => {
    try {
      console.log(`📝 Getting top ${limit} most popular following for user:`, userId);
      
      // Get all following first, then sort by follower_count
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            user_id,
            username,
            display_name,
            avatar_url,
            bio,
            follower_count
          )
        `)
        .eq('follower_id', userId);

      if (!error && data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} following from Supabase`);
        // Sort by follower_count and take top N
        const sortedFollowing = data
          .filter((follow: any) => follow.profiles)
          .sort((a: any, b: any) => (b.profiles.follower_count || 0) - (a.profiles.follower_count || 0))
          .slice(0, limit);
        
        return sortedFollowing.map((follow: any) => ({
          id: follow.profiles.user_id,
          username: follow.profiles.username,
          displayName: follow.profiles.display_name,
          avatar: follow.profiles.avatar_url || '',
          bio: follow.profiles.bio || '',
          followers: [],
          following: [],
        }));
      }
    } catch (error) {
      console.log('⚠️ Error fetching top following from Supabase:', error);
    }

    return [];
  }, []);

  const getWatchHistory = useCallback((userId: string): WatchHistoryItem[] => {
    // Get all posts by this user that have a show (including ones with no episodes for onboarding)
    const userPosts = posts.filter(p => p.user.id === userId && p.show);
    
    // Group posts by show
    const showMap = new Map<string, { show: Show; episodes: Set<string>; lastDate: Date; latestPost: Post }>();
    
    userPosts.forEach(post => {
      if (!post.show) return;
      
      const existing = showMap.get(post.show.id);
      const episodeIds = new Set(post.episodes?.map(e => e.id) || []);
      
      if (existing) {
        // Add episodes to the set
        post.episodes?.forEach(ep => existing.episodes.add(ep.id));
        // Update last date if this post is more recent
        if (post.timestamp > existing.lastDate) {
          existing.lastDate = post.timestamp;
          existing.latestPost = post;
        }
      } else {
        showMap.set(post.show.id, {
          show: post.show,
          episodes: episodeIds,
          lastDate: post.timestamp,
          latestPost: post,
        });
      }
    });
    
    const watchHistory: WatchHistoryItem[] = Array.from(showMap.values()).map(item => {
      let mostRecentEpisode: Episode | null = null;
      if (item.latestPost.episodes && item.latestPost.episodes.length > 0) {
        const sortedEpisodes = [...item.latestPost.episodes].sort((a, b) => {
          if (a.seasonNumber !== b.seasonNumber) {
            return b.seasonNumber - a.seasonNumber;
          }
          return b.episodeNumber - a.episodeNumber;
        });
        mostRecentEpisode = sortedEpisodes[0];
      }
      
      return {
        show: item.show,
        mostRecentEpisode,
        loggedCount: item.episodes.size,
        totalCount: item.show.totalEpisodes ?? item.episodes.size,
        lastWatchedDate: item.lastDate,
      };
    });
    
    // Sort by most recently watched (lastWatchedDate descending)
    watchHistory.sort((a, b) => b.lastWatchedDate.getTime() - a.lastWatchedDate.getTime());
    
    return watchHistory;
  }, [posts]);

  // STATE/ACTIONS/SELECTORS ARCHITECTURE
  // This prevents both stale closures and excessive re-renders by memoizing each layer independently
  
  // Derived selector: check if recommendations are ready (fetched recently, regardless of result count)
  const recommendationsReady = useMemo(() => {
    if (!lastRecommendationFetch) return false;
    const age = Date.now() - lastRecommendationFetch;
    return age < RECOMMENDATION_CACHE_TTL;
  }, [lastRecommendationFetch]);

  // LAYER 1: State - Memoized object containing all raw state
  const state = useMemo(() => ({
    posts,
    reposts,
    playlists,
    userData,
    currentUserData,
    isLoading,
    isDeletingPost,
    authUserId,
    cachedRecommendations,
    isLoadingRecommendations,
    userProfileCache,
    reportedPostIds,
  }), [posts, reposts, playlists, userData, currentUserData, isLoading, isDeletingPost, authUserId, cachedRecommendations, isLoadingRecommendations, userProfileCache, reportedPostIds]);

  // LAYER 2: Selectors - Memoized derived data and read operations
  const selectors = useMemo(() => ({
    currentUser,
    allReposts,
    getWatchHistory,
    isShowInPlaylist,
    getPost,
    hasUserReposted,
    getUserReposts,
    hasUserReportedPost,
    isFollowing,
    recommendationsReady,
    getProfileFeed,
    getHomeFeed,
  }), [currentUser, allReposts, getWatchHistory, isShowInPlaylist, getPost, hasUserReposted, getUserReposts, hasUserReportedPost, isFollowing, recommendationsReady, getProfileFeed, getHomeFeed]);

  // LAYER 3: Actions - All mutation callbacks (already stable via useCallback)
  const actions = useMemo(() => ({
    createPlaylist,
    addShowToPlaylist,
    removeShowFromPlaylist,
    deletePlaylist,
    updatePlaylistPrivacy,
    loadPlaylists,
    createPost,
    deletePost,
    likePost,
    unlikePost,
    repostPost,
    unrepostPost,
    unreportPost,
    updateCommentCount,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getTopFollowers,
    getTopFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
    loadRecommendations,
  }), [
    createPlaylist,
    addShowToPlaylist,
    removeShowFromPlaylist,
    deletePlaylist,
    updatePlaylistPrivacy,
    loadPlaylists,
    recordTraktIdMapping,
    createPost,
    deletePost,
    likePost,
    unlikePost,
    repostPost,
    unrepostPost,
    unreportPost,
    updateCommentCount,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getTopFollowers,
    getTopFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
    loadRecommendations,
  ]);

  // Assemble the context value from the three stable layers
  const contextValue = useMemo(() => ({
    // Spread state
    ...state,
    // Spread selectors
    ...selectors,
    // Spread actions
    ...actions,
    // Exposed helpers
    recordTraktIdMapping,
    ensureShowUuid,
  }), [state, selectors, actions, recordTraktIdMapping, ensureShowUuid]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}
