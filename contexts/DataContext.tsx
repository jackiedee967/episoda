
import { supabase } from '@/app/integrations/supabase/client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Post, Show, User, Playlist, Episode } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { generateAvatarDataURI } from '@/utils/profilePictureGenerator';

interface UserData {
  following: string[];
  followers: string[];
}

interface RepostData {
  postId: string;
  userId: string;
  timestamp: Date;
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
  addShowToPlaylist: (playlistId: string, showId: string) => Promise<void>;
  removeShowFromPlaylist: (playlistId: string, showId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  isShowInPlaylist: (playlistId: string, showId: string) => boolean;
  updatePlaylistPrivacy: (playlistId: string, isPublic: boolean) => Promise<void>;
  loadPlaylists: (userId?: string) => Promise<void>;
  posts: Post[];
  createPost: (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'reposts' | 'isLiked'>) => Promise<Post>;
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
}

const STORAGE_KEYS = {
  POSTS: '@natively_posts',
  USER_DATA: '@natively_user_data',
  REPOSTS: '@natively_reposts',
  PLAYLISTS: '@natively_playlists',
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

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, profileRefreshKey } = useAuth();
  
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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load current user's profile from Supabase
  const loadCurrentUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('Loading current user profile from Supabase:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (profile) {
        const profileData = profile as any;
        console.log('✅ Loaded user profile:', profileData.username);
        
        // Generate avatar data URI if no uploaded avatar but has auto-generated avatar config
        let avatarUrl = profileData.avatar_url || '';
        if (!avatarUrl && profileData.avatar_color_scheme && profileData.avatar_icon) {
          avatarUrl = generateAvatarDataURI(profileData.avatar_color_scheme, profileData.avatar_icon);
          console.log('🎨 Generated avatar data URI for user:', profileData.username);
        }
        
        setCurrentUserData({
          id: userId,
          username: profileData.username || 'user',
          displayName: profileData.display_name || profileData.username || 'User',
          avatar: avatarUrl,
          bio: profileData.bio || '',
          socialLinks: profileData.social_links || {},
          following: [],
          followers: [],
        });
      }
    } catch (error) {
      console.error('Error loading user profile from Supabase:', error);
    }
  }, []);

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
  }, []);

  const loadUserProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('*')
        .in('user_id', userIds);

      if (error) {
        console.error('Error batch-loading user profiles:', error);
        return;
      }

      if (data) {
        const newProfiles: Record<string, User> = {};
        data.forEach((profile: any) => {
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
            socialLinks: profile.social_links || [],
            following: [],
            followers: [],
          };
        });
        
        setUserProfileCache(prev => ({ ...prev, ...newProfiles }));
      }
    } catch (error) {
      console.error('Error batch-loading user profiles:', error);
    }
  }, []);

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
      loadCurrentUserProfile(user.id);
      loadFollowDataFromSupabase(user.id);
    } else {
      console.log('⚠️ User signed out - clearing all data');
      setAuthUserId(null);
      setCurrentUserData(EMPTY_USER);
      setUserData({
        following: [],
        followers: [],
      });
      setPosts([]);
      setReposts([]);
      setPlaylists([]);
      setUserProfileCache({});
    }
  }, [user, profileRefreshKey, loadCurrentUserProfile, loadFollowDataFromSupabase]);

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

  const addShowToPlaylist = useCallback(async (playlistId: string, showId: string) => {
    try {
      console.log('📝 Adding show to playlist:', playlistId, showId);

      if (authUserId) {
        const { error } = await supabase
          .from('playlist_shows')
          .insert({
            playlist_id: playlistId,
            show_id: showId,
          });

        if (error) {
          console.error('❌ Error adding show to playlist in Supabase:', error);
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

      // Update local state
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, shows: [...(p.shows || []), showId], showCount: (p.shows?.length || 0) + 1 }
          : p
      ));

      const updatedPlaylists = playlists.map(p => 
        p.id === playlistId 
          ? { ...p, shows: [...(p.shows || []), showId], showCount: (p.shows?.length || 0) + 1 }
          : p
      );
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
    } catch (error) {
      console.error('❌ Error adding show to playlist:', error);
      throw error;
    }
  }, [playlists, authUserId]);

  const removeShowFromPlaylist = useCallback(async (playlistId: string, showId: string) => {
    try {
      console.log('📝 Removing show from playlist:', playlistId, showId);

      if (authUserId) {
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
            .eq('id', playlistId);
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
          .eq('id', playlistId);

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

  const isShowInPlaylist = useCallback((playlistId: string, showId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist ? (playlist.shows || []).includes(showId) : false;
  }, [playlists]);

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
          const loadedPlaylists: Playlist[] = data.map(p => {
            const shows = p.playlist_shows.map((ps: any) => ps.show_id);
            return {
              id: p.id,
              name: p.name,
              userId: p.user_id,
              shows: shows,
              showCount: shows.length,
              isPublic: p.is_public,
              createdAt: new Date(p.created_at),
            };
          });

          console.log('✅ Loaded', loadedPlaylists.length, 'playlists from Supabase');
          setPlaylists(loadedPlaylists);
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(loadedPlaylists));
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

        // Step 2: Extract unique IDs for batch fetching
        const postIds = postsData.map((p: any) => p.id);
        const uniqueUserIds = [...new Set(postsData.map((p: any) => p.user_id))];
        const uniqueShowIds = [...new Set(postsData.map((p: any) => p.show_id))];
        const allEpisodeIds = [...new Set(postsData.flatMap((p: any) => p.episode_ids || []))];

        // Step 3: Batch fetch all related data (scoped to these 100 posts)
        const [usersResult, showsResult, episodesResult, likesResult, repostsResult, userLikesResult] = await Promise.all([
          // Fetch all user profiles
          supabase.from('profiles').select('*').in('user_id', uniqueUserIds),
          // Fetch all shows
          supabase.from('shows').select('*').in('id', uniqueShowIds),
          // Fetch all episodes
          allEpisodeIds.length > 0 ? supabase.from('episodes').select('*').in('id', allEpisodeIds) : { data: [] },
          // Fetch likes ONLY for these posts
          supabase.from('likes').select('post_id').in('post_id', postIds),
          // Fetch reposts ONLY for these posts
          supabase.from('reposts').select('post_id').in('post_id', postIds),
          // Fetch current user's likes ONLY for these posts
          supabase.from('likes').select('post_id').eq('user_id', authUserId).in('post_id', postIds),
        ]);

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
            socialLinks: profile.social_links || {},
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
                .from('profiles')
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
                socialLinks: profileData.social_links || {},
                following: [],
                followers: [],
              });
              console.log('✅ Fetched missing profile:', profileData.username);
            }
          });
        }

        const showsMap = new Map();
        (showsResult.data || []).forEach((show: any) => {
          showsMap.set(show.id, show);
        });

        const episodesMap = new Map();
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

        // Count likes, reposts per post (comments not implemented yet)
        const likesCount = new Map();
        (likesResult.data || []).forEach((like: any) => {
          likesCount.set(like.post_id, (likesCount.get(like.post_id) || 0) + 1);
        });

        const repostsCount = new Map();
        (repostsResult.data || []).forEach((repost: any) => {
          repostsCount.set(repost.post_id, (repostsCount.get(repost.post_id) || 0) + 1);
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
            socialLinks: {},
            following: [],
            followers: [],
          };

          const showData = showsMap.get(dbPost.show_id);
          
          // Map episode IDs to episodes in original order
          const episodes = (dbPost.episode_ids || [])
            .map((id: string) => episodesMap.get(id))
            .filter((ep: any) => ep !== undefined);

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
            },
            episodes: episodes.length > 0 ? episodes : undefined,
            episode: episodes.length > 0 ? episodes[0] : undefined,
            title: dbPost.title || undefined,
            body: dbPost.body || '',
            timestamp: new Date(dbPost.created_at),
            likes: likesCount.get(dbPost.id) || 0,
            comments: 0, // Comment counts not implemented yet
            reposts: repostsCount.get(dbPost.id) || 0,
            isLiked: userLikesSet.has(dbPost.id),
            rating: dbPost.rating || undefined,
            tags: dbPost.tags || [],
            isSpoiler: (dbPost.tags || []).some((tag: string) => tag.toLowerCase().includes('spoiler')),
          };
        });

        console.log('✅ Transformed', loadedPosts.length, 'posts successfully');
        setPosts(loadedPosts);
        await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(loadedPosts));
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

  // Load posts and playlists when authUserId is set
  useEffect(() => {
    if (authUserId) {
      loadPosts();
      loadPlaylists();
    }
  }, [authUserId, loadPosts, loadPlaylists]);

  const createPost = useCallback(async (postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'reposts' | 'isLiked'>): Promise<Post> => {
    // Create temporary post with fake ID for optimistic UI
    const tempId = `post_${Date.now()}`;
    const tempPost: Post = {
      ...postData,
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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      return updatedPosts;
    });

    // Try to save to Supabase and get real UUID
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const episodeIds = postData.episodes?.map(ep => ep.id) || [];
        
        const { data, error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            show_id: postData.show.id,
            show_title: postData.show.title,
            show_poster: postData.show.poster,
            episode_ids: episodeIds,
            title: postData.title,
            body: postData.body,
            rating: postData.rating,
            tags: postData.tags,
          })
          .select()
          .single();

        if (!error && data) {
          // Replace temp ID with real Supabase UUID
          const realPost: Post = {
            ...tempPost,
            id: data.id, // Use the UUID from Supabase
          };

          // Update posts array with real UUID
          setPosts(prev => {
            const updatedPosts = prev.map(p => p.id === tempId ? realPost : p);
            AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
            return updatedPosts;
          });

          // Log episodes to watch_history
          if (episodeIds.length > 0) {
            const watchHistoryEntries = episodeIds.map(episodeId => ({
              user_id: user.id,
              show_id: postData.show.id,
              episode_id: episodeId,
            }));

            await supabase
              .from('watch_history')
              .insert(watchHistoryEntries);
          }

          // Update profile stats
          await supabase.rpc('update_user_profile_stats', { user_id: user.id });

          return realPost;
        }
      }
    } catch (error) {
      console.log('Error saving post to Supabase:', error);
    }

    // Return temp post if Supabase failed
    return tempPost;
  }, []);

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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
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

      // Step 4: Delete comments referencing this post
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('post_id', postId);

      if (commentsError) {
        console.error('❌ Error deleting comments:', commentsError);
        throw commentsError;
      }

      // Step 5: Delete reposts referencing this post
      const { error: repostsError } = await supabase
        .from('reposts')
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
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(previousPosts));
      if (isReposted) {
        await AsyncStorage.setItem(STORAGE_KEYS.REPOSTS, JSON.stringify(previousReposts));
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
  }, [posts, reposts, isDeletingPost]);

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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      return updatedPosts;
    });

    // Save to Supabase in background
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Insert like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

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
      console.error('Error liking post in Supabase:', error);
      // Rollback only this specific post
      setPosts(prev => {
        const rolledBackPosts = prev.map(post =>
          post.id === postId
            ? { ...post, likes: previousLikes, isLiked: previousIsLiked }
            : post
        );
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(rolledBackPosts));
        return rolledBackPosts;
      });
    }
  }, []);

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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
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
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(rolledBackPosts));
        return rolledBackPosts;
      });
    }
  }, []);

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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      return updatedPosts;
    });
  }, [currentUser.id]);

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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      return updatedPosts;
    });
  }, [currentUser.id]);

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

  const updateCommentCount = useCallback(async (postId: string, count: number) => {
    setPosts(prev => {
      const updatedPosts = prev.map(post =>
        post.id === postId
          ? { ...post, comments: count }
          : post
      );
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      return updatedPosts;
    });
  }, []);

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
      
      // Try to get from Supabase
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
        .eq('following_id', userId);

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
      
      // Try to get from Supabase
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
        .eq('follower_id', userId);

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
      // Try to get from Supabase
      const { data, error } = await supabase
        .from('watch_history')
        .select('episode_id')
        .eq('user_id', userId);

      if (!error && data) {
        // Count unique episodes
        const uniqueEpisodes = new Set(data.map(item => item.episode_id));
        return uniqueEpisodes.size;
      }
    } catch (error) {
      console.log('Error fetching episodes watched count from Supabase:', error);
    }

    // Fallback: count from posts (episodes logged)
    const userPosts = posts.filter(p => p.user.id === userId);
    const episodeIds = new Set<string>();
    userPosts.forEach(post => {
      if (post.episodes && post.episodes.length > 0) {
        post.episodes.forEach(ep => episodeIds.add(ep.id));
      }
    });
    return episodeIds.size;
  }, [posts]);

  const getTotalLikesReceived = useCallback(async (userId: string): Promise<number> => {
    try {
      // Try to get from Supabase
      const { data, error } = await supabase
        .from('posts')
        .select('likes')
        .eq('user_id', userId);

      if (!error && data) {
        return data.reduce((sum, post) => sum + (post.likes || 0), 0);
      }
    } catch (error) {
      console.log('Error fetching total likes received from Supabase:', error);
    }

    // Fallback: count from local posts
    const userPosts = posts.filter(p => p.user.id === userId);
    return userPosts.reduce((sum, post) => sum + post.likes, 0);
  }, [posts]);

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
    // Get all posts by this user that have episodes
    const userPosts = posts.filter(p => p.user.id === userId && p.episodes && p.episodes.length > 0);
    
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
        totalCount: item.episodes.size,
        lastWatchedDate: item.lastDate,
      };
    });
    
    // Sort by most recently watched (lastWatchedDate descending)
    watchHistory.sort((a, b) => b.lastWatchedDate.getTime() - a.lastWatchedDate.getTime());
    
    return watchHistory;
  }, [posts]);

  // STATE/ACTIONS/SELECTORS ARCHITECTURE
  // This prevents both stale closures and excessive re-renders by memoizing each layer independently
  
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
  }), [posts, reposts, playlists, userData, currentUserData, isLoading, isDeletingPost, authUserId]);

  // LAYER 2: Selectors - Memoized derived data and read operations
  const selectors = useMemo(() => ({
    currentUser,
    allReposts,
    getWatchHistory,
    isShowInPlaylist,
    getPost,
    hasUserReposted,
    getUserReposts,
    isFollowing,
  }), [currentUser, allReposts, getWatchHistory, isShowInPlaylist, getPost, hasUserReposted, getUserReposts, isFollowing]);

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
    updateCommentCount,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getTopFollowers,
    getTopFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
  }), [
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
    updateCommentCount,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getTopFollowers,
    getTopFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
  ]);

  // Assemble the context value from the three stable layers
  const contextValue = useMemo(() => ({
    // Spread state
    ...state,
    // Spread selectors
    ...selectors,
    // Spread actions
    ...actions,
  }), [state, selectors, actions]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}
