
import { supabase } from '@/app/integrations/supabase/client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { mockPosts, mockUsers, currentUser as mockCurrentUser } from '@/data/mockData';
import { Post, Show, User, Playlist } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface UserData {
  following: string[];
  followers: string[];
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
  getEpisodesWatchedCount: (userId: string) => Promise<number>;
  getTotalLikesReceived: (userId: string) => Promise<number>;
  isLoading: boolean;
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
      console.log('Loading follow data from Supabase for user:', userId);
      
      // Get users this user is following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) {
        console.error('Error loading following data:', followingError);
      } else {
        const followingIds = followingData?.map(f => f.following_id) || [];
        console.log('✅ Loaded following from Supabase:', followingIds.length, 'users');
        
        setUserData(prev => ({
          ...prev,
          following: followingIds,
        }));
      }
    } catch (error) {
      console.error('Error loading follow data from Supabase:', error);
    }
  };

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
        const updatedUserData = {
          ...userData,
          following: [...userData.following, userId],
        };
        setUserData(updatedUserData);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
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
      const updatedUserData = {
        ...userData,
        following: [...userData.following, userId],
      };
      setUserData(updatedUserData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));

      console.log('✅ Follow completed successfully');
    } catch (error) {
      console.error('❌ Error following user:', error);
      throw error;
    }
  }, [userData, authUserId]);

  const unfollowUser = useCallback(async (userId: string) => {
    console.log('🔴 unfollowUser called for userId:', userId);
    
    try {
      // Check if user is authenticated
      if (!authUserId) {
        console.log('⚠️ No authenticated user - cannot unfollow');
        
        // Update local state only
        const updatedUserData = {
          ...userData,
          following: userData.following.filter(id => id !== userId),
        };
        setUserData(updatedUserData);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
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
      const updatedUserData = {
        ...userData,
        following: userData.following.filter(id => id !== userId),
      };
      setUserData(updatedUserData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));

      console.log('✅ Unfollow completed successfully');
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      throw error;
    }
  }, [userData, authUserId]);

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
          avatar: follow.profiles.avatar_url || mockCurrentUser.avatar,
          bio: follow.profiles.bio || '',
          followers: [],
          following: [],
        }));
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
        return data.map((follow: any) => ({
          id: follow.profiles.user_id,
          username: follow.profiles.username,
          displayName: follow.profiles.display_name,
          avatar: follow.profiles.avatar_url || mockCurrentUser.avatar,
          bio: follow.profiles.bio || '',
          followers: [],
          following: [],
        }));
      }
    } catch (error) {
      console.log('⚠️ Error fetching following from Supabase:', error);
    }

    // Fallback to mock data
    console.log('⚠️ Using mock data for following');
    const user = mockUsers.find(u => u.id === userId) || mockCurrentUser;
    return mockUsers.filter(u => user.following?.includes(u.id));
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
        getEpisodesWatchedCount,
        getTotalLikesReceived,
        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
