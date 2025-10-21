
import { supabase } from '@/app/integrations/supabase/client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { mockPosts, mockUsers, currentUser as mockCurrentUser } from '@/data/mockData';
import { Post, Show, User, Playlist } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface UserData {
  following: string[];
  followers: string[];
  followerCount: number;
  followingCount: number;
}

interface RepostData {
  postId: string;
  userId: string;
  timestamp: Date;
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
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  repostPost: (postId: string) => Promise<void>;
  unrepostPost: (postId: string) => Promise<void>;
  updateCommentCount: (postId: string, count: number) => Promise<void>;
  getPost: (postId: string) => Post | undefined;
  hasUserReposted: (postId: string) => boolean;
  getUserReposts: () => Post[];
  getAllReposts: () => { post: Post; repostedBy: User; timestamp: Date }[];
  currentUser: User;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  getFollowers: (userId: string) => Promise<User[]>;
  getFollowing: (userId: string) => Promise<User[]>;
  getFollowerCount: (userId: string) => Promise<number>;
  getFollowingCount: (userId: string) => Promise<number>;
  getEpisodesWatchedCount: (userId: string) => Promise<number>;
  getTotalLikesReceived: (userId: string) => Promise<number>;
  isLoading: boolean;
  refreshFollowData: () => Promise<void>;
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

export function DataProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [userData, setUserData] = useState<UserData>({
    following: mockCurrentUser.following || [],
    followers: mockCurrentUser.followers || [],
    followerCount: 0,
    followingCount: 0,
  });
  const [reposts, setReposts] = useState<RepostData[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // MOCK USER - Always use jvckie as the current user (authentication bypassed)
  const [currentUser, setCurrentUser] = useState<User>(mockCurrentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
    checkAuthStatus();
  }, []);

  // Check if user is authenticated in Supabase
  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('✅ User authenticated in Supabase:', user.id);
        setAuthUserId(user.id);
        
        // Load user's follow data from Supabase
        await loadFollowDataFromSupabase(user.id);
      } else {
        console.log('⚠️ No authenticated user - using mock data only');
        setAuthUserId(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthUserId(null);
    }
  };

  // Load follow data from Supabase
  const loadFollowDataFromSupabase = async (userId: string) => {
    try {
      console.log('📊 Loading follow data from Supabase for user:', userId);
      
      // Get users this user is following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) {
        console.error('❌ Error loading following data:', followingError);
      } else {
        const followingIds = followingData?.map(f => f.following_id) || [];
        console.log('✅ Loaded following from Supabase:', followingIds.length, 'users');
        
        // Get follower and following counts
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('follower_count, following_count')
          .eq('user_id', userId)
          .single();

        if (profileError) {
          console.error('❌ Error loading profile counts:', profileError);
        }

        setUserData(prev => ({
          ...prev,
          following: followingIds,
          followerCount: profileData?.follower_count || 0,
          followingCount: profileData?.following_count || 0,
        }));
      }
    } catch (error) {
      console.error('❌ Error loading follow data from Supabase:', error);
    }
  };

  const refreshFollowData = useCallback(async () => {
    if (authUserId) {
      await loadFollowDataFromSupabase(authUserId);
    }
  }, [authUserId]);

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

        await supabase
          .from('playlists')
          .update({ show_count: supabase.raw('show_count + 1') })
          .eq('id', playlistId);

        console.log('✅ Show added to playlist in Supabase');
      }

      // Update local state
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, shows: [...p.shows, showId] }
          : p
      ));

      const updatedPlaylists = playlists.map(p => 
        p.id === playlistId 
          ? { ...p, shows: [...p.shows, showId] }
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

        await supabase
          .from('playlists')
          .update({ show_count: supabase.raw('show_count - 1') })
          .eq('id', playlistId);

        console.log('✅ Show removed from playlist in Supabase');
      }

      // Update local state
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, shows: p.shows.filter(id => id !== showId) }
          : p
      ));

      const updatedPlaylists = playlists.map(p => 
        p.id === playlistId 
          ? { ...p, shows: p.shows.filter(id => id !== showId) }
          : p
      );
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
    } catch (error) {
      console.error('❌ Error removing show from playlist:', error);
      throw error;
    }
  }, [playlists, authUserId]);

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
      const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
      setPlaylists(updatedPlaylists);
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
    } catch (error) {
      console.error('❌ Error deleting playlist:', error);
      throw error;
    }
  }, [playlists, authUserId]);

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
      const updatedPlaylists = playlists.map(p => 
        p.id === playlistId 
          ? { ...p, isPublic }
          : p
      );
      setPlaylists(updatedPlaylists);
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
    } catch (error) {
      console.error('❌ Error updating playlist privacy:', error);
      throw error;
    }
  }, [playlists, authUserId]);

  const isShowInPlaylist = useCallback((playlistId: string, showId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist ? playlist.shows.includes(showId) : false;
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
          const loadedPlaylists: Playlist[] = data.map(p => ({
            id: p.id,
            name: p.name,
            userId: p.user_id,
            shows: p.playlist_shows.map((ps: any) => ps.show_id),
            isPublic: p.is_public,
            createdAt: new Date(p.created_at),
          }));

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

  const createPost = useCallback(async (postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'reposts' | 'isLiked'>): Promise<Post> => {
    const newPost: Post = {
      ...postData,
      id: `post_${Date.now()}`,
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      reposts: 0,
      isLiked: false,
    };

    // Try to save to Supabase
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
          await supabase.rpc('update_user_profile_stats', { target_user_id: user.id });
        }
      }
    } catch (error) {
      console.log('Error saving post to Supabase:', error);
    }

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    return newPost;
  }, [posts]);

  const likePost = useCallback(async (postId: string) => {
    // Try to save to Supabase
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
          await supabase.rpc('update_user_profile_stats', { target_user_id: postData.user_id });
        }
      }
    } catch (error) {
      console.log('Error liking post in Supabase:', error);
    }

    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, likes: post.likes + 1, isLiked: true }
        : post
    );
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
  }, [posts]);

  const unlikePost = useCallback(async (postId: string) => {
    // Try to remove from Supabase
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
          await supabase.rpc('update_user_profile_stats', { target_user_id: postData.user_id });
        }
      }
    } catch (error) {
      console.log('Error unliking post in Supabase:', error);
    }

    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, likes: Math.max(0, post.likes - 1), isLiked: false }
        : post
    );
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
  }, [posts]);

  const repostPost = useCallback(async (postId: string) => {
    const newRepost: RepostData = {
      postId,
      userId: currentUser.id,
      timestamp: new Date(),
    };

    const updatedReposts = [...reposts, newRepost];
    setReposts(updatedReposts);
    await saveRepostsToStorage(updatedReposts);

    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, reposts: post.reposts + 1 }
        : post
    );
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
  }, [posts, reposts, currentUser.id]);

  const unrepostPost = useCallback(async (postId: string) => {
    const updatedReposts = reposts.filter(
      r => !(r.postId === postId && r.userId === currentUser.id)
    );
    setReposts(updatedReposts);
    await saveRepostsToStorage(updatedReposts);

    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, reposts: Math.max(0, post.reposts - 1) }
        : post
    );
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
  }, [posts, reposts, currentUser.id]);

  const hasUserReposted = useCallback((postId: string): boolean => {
    return reposts.some(r => r.postId === postId && r.userId === currentUser.id);
  }, [reposts, currentUser.id]);

  const getUserReposts = useCallback((): Post[] => {
    const userRepostIds = reposts
      .filter(r => r.userId === currentUser.id)
      .map(r => r.postId);
    return posts.filter(p => userRepostIds.includes(p.id));
  }, [posts, reposts, currentUser.id]);

  const getAllReposts = useCallback(() => {
    return reposts.map(repost => {
      const post = posts.find(p => p.id === repost.postId);
      const user = mockUsers.find(u => u.id === repost.userId) || currentUser;
      return {
        post: post!,
        repostedBy: user,
        timestamp: repost.timestamp,
      };
    }).filter(r => r.post);
  }, [posts, reposts, currentUser]);

  const updateCommentCount = useCallback(async (postId: string, count: number) => {
    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, comments: count }
        : post
    );
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
  }, [posts]);

  const getPost = useCallback((postId: string): Post | undefined => {
    return posts.find(p => p.id === postId);
  }, [posts]);

  const followUser = useCallback(async (userId: string) => {
    console.log('🔵 ========== FOLLOW USER START ==========');
    console.log('🔵 Target userId:', userId);
    console.log('🔵 Current authUserId:', authUserId);
    
    try {
      // Check if user is authenticated
      if (!authUserId) {
        console.log('⚠️ No authenticated user - cannot follow');
        Alert.alert(
          'Authentication Required',
          'Please log in to follow users.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if already following
      if (userData.following.includes(userId)) {
        console.log('⚠️ Already following this user');
        return;
      }

      // STEP 1: DATABASE WRITE
      console.log('💾 STEP 1: Writing to follows table...');
      console.log('   follower_id:', authUserId);
      console.log('   following_id:', userId);

      const { data: insertData, error: insertError } = await supabase
        .from('follows')
        .insert({
          follower_id: authUserId,
          following_id: userId,
        })
        .select();

      if (insertError) {
        console.error('❌ DATABASE WRITE FAILED:', insertError);
        console.error('   Error code:', insertError.code);
        console.error('   Error message:', insertError.message);
        console.error('   Error details:', insertError.details);
        
        Alert.alert(
          'Follow Failed',
          `Could not follow user: ${insertError.message}`,
          [{ text: 'OK' }]
        );
        throw insertError;
      }

      console.log('✅ STEP 1 COMPLETE: Follow saved to database:', insertData);

      // STEP 2: VERIFY DATABASE WRITE
      console.log('🔍 STEP 2: Verifying database write...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', authUserId)
        .eq('following_id', userId);

      if (verifyError) {
        console.error('❌ VERIFICATION FAILED:', verifyError);
      } else {
        console.log('✅ STEP 2 COMPLETE: Follow verified in database:', verifyData);
        console.log('   Records found:', verifyData?.length || 0);
      }

      // STEP 3: UPDATE COUNTS IN DATABASE (handled by trigger automatically)
      console.log('⏳ STEP 3: Counts should be updated by database trigger...');
      
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify counts were updated
      const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('following_count')
        .eq('user_id', authUserId)
        .single();

      const { data: theirProfile, error: theirProfileError } = await supabase
        .from('profiles')
        .select('follower_count')
        .eq('user_id', userId)
        .single();

      if (!myProfileError && myProfile) {
        console.log('✅ My following_count:', myProfile.following_count);
      }
      if (!theirProfileError && theirProfile) {
        console.log('✅ Their follower_count:', theirProfile.follower_count);
      }

      // STEP 4: UPDATE LOCAL STATE
      console.log('📱 STEP 4: Updating local state...');
      const updatedUserData = {
        ...userData,
        following: [...userData.following, userId],
        followingCount: (myProfile?.following_count || userData.followingCount) + 1,
      };
      setUserData(updatedUserData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
      console.log('✅ STEP 4 COMPLETE: Local state updated');

      // STEP 5: REFRESH FOLLOW DATA TO ENSURE SYNC
      console.log('🔄 STEP 5: Refreshing follow data...');
      await loadFollowDataFromSupabase(authUserId);
      console.log('✅ STEP 5 COMPLETE: Follow data refreshed');

      console.log('✅ ========== FOLLOW USER COMPLETE ==========');
    } catch (error) {
      console.error('❌ ========== FOLLOW USER FAILED ==========');
      console.error('❌ Error:', error);
      throw error;
    }
  }, [userData, authUserId, loadFollowDataFromSupabase]);

  const unfollowUser = useCallback(async (userId: string) => {
    console.log('🔴 ========== UNFOLLOW USER START ==========');
    console.log('🔴 Target userId:', userId);
    console.log('🔴 Current authUserId:', authUserId);
    
    try {
      // Check if user is authenticated
      if (!authUserId) {
        console.log('⚠️ No authenticated user - cannot unfollow');
        return;
      }

      // Check if not following
      if (!userData.following.includes(userId)) {
        console.log('⚠️ Not following this user');
        return;
      }

      // STEP 1: DELETE FROM DATABASE
      console.log('💾 STEP 1: Deleting from follows table...');
      console.log('   follower_id:', authUserId);
      console.log('   following_id:', userId);

      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', authUserId)
        .eq('following_id', userId);

      if (deleteError) {
        console.error('❌ DATABASE DELETE FAILED:', deleteError);
        console.error('   Error code:', deleteError.code);
        console.error('   Error message:', deleteError.message);
        
        Alert.alert(
          'Unfollow Failed',
          `Could not unfollow user: ${deleteError.message}`,
          [{ text: 'OK' }]
        );
        throw deleteError;
      }

      console.log('✅ STEP 1 COMPLETE: Follow deleted from database');

      // STEP 2: VERIFY DATABASE DELETE
      console.log('🔍 STEP 2: Verifying database delete...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', authUserId)
        .eq('following_id', userId);

      if (verifyError) {
        console.error('❌ VERIFICATION FAILED:', verifyError);
      } else {
        console.log('✅ STEP 2 COMPLETE: Unfollow verified - records found:', verifyData?.length || 0);
        if (verifyData && verifyData.length > 0) {
          console.error('⚠️ WARNING: Follow relationship still exists in database!');
        }
      }

      // STEP 3: UPDATE COUNTS (handled by trigger automatically)
      console.log('⏳ STEP 3: Counts should be updated by database trigger...');
      
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify counts were updated
      const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('following_count')
        .eq('user_id', authUserId)
        .single();

      const { data: theirProfile, error: theirProfileError } = await supabase
        .from('profiles')
        .select('follower_count')
        .eq('user_id', userId)
        .single();

      if (!myProfileError && myProfile) {
        console.log('✅ My following_count:', myProfile.following_count);
      }
      if (!theirProfileError && theirProfile) {
        console.log('✅ Their follower_count:', theirProfile.follower_count);
      }

      // STEP 4: UPDATE LOCAL STATE
      console.log('📱 STEP 4: Updating local state...');
      const updatedUserData = {
        ...userData,
        following: userData.following.filter(id => id !== userId),
        followingCount: Math.max(0, (myProfile?.following_count || userData.followingCount) - 1),
      };
      setUserData(updatedUserData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
      console.log('✅ STEP 4 COMPLETE: Local state updated');

      // STEP 5: REFRESH FOLLOW DATA TO ENSURE SYNC
      console.log('🔄 STEP 5: Refreshing follow data...');
      await loadFollowDataFromSupabase(authUserId);
      console.log('✅ STEP 5 COMPLETE: Follow data refreshed');

      console.log('✅ ========== UNFOLLOW USER COMPLETE ==========');
    } catch (error) {
      console.error('❌ ========== UNFOLLOW USER FAILED ==========');
      console.error('❌ Error:', error);
      throw error;
    }
  }, [userData, authUserId, loadFollowDataFromSupabase]);

  const isFollowing = useCallback((userId: string): boolean => {
    const following = userData.following.includes(userId);
    console.log('🔍 isFollowing check for', userId, ':', following);
    return following;
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
        
        // Check for mutual follows
        const followers = await Promise.all(data.map(async (follow: any) => {
          const followerId = follow.profiles.user_id;
          
          // Check if this is a mutual follow
          const { data: mutualData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', userId)
            .eq('following_id', followerId)
            .single();

          return {
            id: followerId,
            username: follow.profiles.username,
            displayName: follow.profiles.display_name,
            avatar: follow.profiles.avatar_url || mockCurrentUser.avatar,
            bio: follow.profiles.bio || '',
            followers: [],
            following: [],
            isMutual: !!mutualData,
          };
        }));

        // Sort: mutual follows first, then alphabetically
        return followers.sort((a, b) => {
          if (a.isMutual && !b.isMutual) return -1;
          if (!a.isMutual && b.isMutual) return 1;
          return a.displayName.localeCompare(b.displayName);
        });
      }
    } catch (error) {
      console.log('⚠️ Error fetching followers from Supabase:', error);
    }

    // Fallback to mock data
    console.log('⚠️ Using mock data for followers');
    return mockUsers.filter(u => u.following?.includes(userId));
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
        
        // Check for mutual follows
        const following = await Promise.all(data.map(async (follow: any) => {
          const followingId = follow.profiles.user_id;
          
          // Check if this is a mutual follow
          const { data: mutualData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', followingId)
            .eq('following_id', userId)
            .single();

          return {
            id: followingId,
            username: follow.profiles.username,
            displayName: follow.profiles.display_name,
            avatar: follow.profiles.avatar_url || mockCurrentUser.avatar,
            bio: follow.profiles.bio || '',
            followers: [],
            following: [],
            isMutual: !!mutualData,
          };
        }));

        // Sort: mutual follows first, then alphabetically
        return following.sort((a, b) => {
          if (a.isMutual && !b.isMutual) return -1;
          if (!a.isMutual && b.isMutual) return 1;
          return a.displayName.localeCompare(b.displayName);
        });
      }
    } catch (error) {
      console.log('⚠️ Error fetching following from Supabase:', error);
    }

    // Fallback to mock data
    console.log('⚠️ Using mock data for following');
    const user = mockUsers.find(u => u.id === userId) || mockCurrentUser;
    return mockUsers.filter(u => user.following?.includes(u.id));
  }, []);

  const getFollowerCount = useCallback(async (userId: string): Promise<number> => {
    try {
      console.log('📊 Getting follower count for user:', userId);
      
      // Try to get from Supabase profile
      const { data, error } = await supabase
        .from('profiles')
        .select('follower_count')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        console.log('✅ Follower count from Supabase:', data.follower_count);
        return data.follower_count || 0;
      }

      // Fallback: count from follows table
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (!followsError) {
        console.log('✅ Follower count from follows table:', followsData);
        return 0; // count is in the response metadata
      }
    } catch (error) {
      console.log('⚠️ Error fetching follower count from Supabase:', error);
    }

    // Fallback to mock data
    return mockUsers.filter(u => u.following?.includes(userId)).length;
  }, []);

  const getFollowingCount = useCallback(async (userId: string): Promise<number> => {
    try {
      console.log('📊 Getting following count for user:', userId);
      
      // Try to get from Supabase profile
      const { data, error } = await supabase
        .from('profiles')
        .select('following_count')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        console.log('✅ Following count from Supabase:', data.following_count);
        return data.following_count || 0;
      }

      // Fallback: count from follows table
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId);

      if (!followsError) {
        console.log('✅ Following count from follows table:', followsData);
        return 0; // count is in the response metadata
      }
    } catch (error) {
      console.log('⚠️ Error fetching following count from Supabase:', error);
    }

    // Fallback to mock data
    const user = mockUsers.find(u => u.id === userId) || mockCurrentUser;
    return user.following?.length || 0;
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
        .select('likes_count')
        .eq('user_id', userId);

      if (!error && data) {
        return data.reduce((sum, post) => sum + (post.likes_count || 0), 0);
      }
    } catch (error) {
      console.log('Error fetching total likes received from Supabase:', error);
    }

    // Fallback: count from local posts
    const userPosts = posts.filter(p => p.user.id === userId);
    return userPosts.reduce((sum, post) => sum + post.likes, 0);
  }, [posts]);

  return (
    <DataContext.Provider
      value={{
        playlists,
        createPlaylist,
        addShowToPlaylist,
        removeShowFromPlaylist,
        deletePlaylist,
        isShowInPlaylist,
        updatePlaylistPrivacy,
        loadPlaylists,
        posts,
        createPost,
        likePost,
        unlikePost,
        repostPost,
        unrepostPost,
        updateCommentCount,
        getPost,
        hasUserReposted,
        getUserReposts,
        getAllReposts,
        currentUser,
        followUser,
        unfollowUser,
        isFollowing,
        getFollowers,
        getFollowing,
        getFollowerCount,
        getFollowingCount,
        getEpisodesWatchedCount,
        getTotalLikesReceived,
        isLoading,
        refreshFollowData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
