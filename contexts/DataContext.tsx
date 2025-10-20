
import { supabase } from '@/app/integrations/supabase/client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { mockPosts, mockUsers, currentUser as mockCurrentUser } from '@/data/mockData';
import { Post, Show, User, Playlist } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    following: [],
    followers: [],
  });
  const [reposts, setReposts] = useState<RepostData[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(mockCurrentUser);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load current user profile from Supabase
  useEffect(() => {
    loadCurrentUserProfile();
  }, []);

  const loadCurrentUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Loading profile for user:', user.id);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile:', error);
          // Use mock user if profile doesn't exist
          return;
        }

        if (profile) {
          console.log('Profile loaded:', profile);
          
          // Update current user with profile data
          setCurrentUser({
            id: profile.user_id,
            username: profile.username,
            displayName: profile.display_name,
            avatar: profile.avatar_url || mockCurrentUser.avatar,
            bio: profile.bio || '',
            episodesWatched: profile.episodes_watched_count || 0,
            totalLikes: profile.total_likes_received || 0,
            isOnline: profile.is_online || false,
            lastActive: profile.last_active_at ? new Date(profile.last_active_at) : new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error loading current user profile:', error);
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name,
          is_public: true,
          show_count: showId ? 1 : 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (showId && data) {
        await supabase
          .from('playlist_shows')
          .insert({
            playlist_id: data.id,
            show_id: showId,
          });
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
      console.error('Error creating playlist:', error);
      throw error;
    }
  }, [playlists]);

  const addShowToPlaylist = useCallback(async (playlistId: string, showId: string) => {
    try {
      await supabase
        .from('playlist_shows')
        .insert({
          playlist_id: playlistId,
          show_id: showId,
        });

      await supabase
        .from('playlists')
        .update({ show_count: supabase.raw('show_count + 1') })
        .eq('id', playlistId);

      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, shows: [...p.shows, showId] }
          : p
      ));

      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (error) {
      console.error('Error adding show to playlist:', error);
      throw error;
    }
  }, [playlists]);

  const removeShowFromPlaylist = useCallback(async (playlistId: string, showId: string) => {
    try {
      await supabase
        .from('playlist_shows')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('show_id', showId);

      await supabase
        .from('playlists')
        .update({ show_count: supabase.raw('show_count - 1') })
        .eq('id', playlistId);

      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, shows: p.shows.filter(id => id !== showId) }
          : p
      ));

      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (error) {
      console.error('Error removing show from playlist:', error);
      throw error;
    }
  }, [playlists]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    try {
      await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists.filter(p => p.id !== playlistId)));
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }, [playlists]);

  const updatePlaylistPrivacy = useCallback(async (playlistId: string, isPublic: boolean) => {
    try {
      await supabase
        .from('playlists')
        .update({ is_public: isPublic })
        .eq('id', playlistId);

      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, isPublic }
          : p
      ));

      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (error) {
      console.error('Error updating playlist privacy:', error);
      throw error;
    }
  }, [playlists]);

  const isShowInPlaylist = useCallback((playlistId: string, showId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist ? playlist.shows.includes(showId) : false;
  }, [playlists]);

  const loadPlaylists = useCallback(async (userId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) return;

      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_shows (
            show_id
          )
        `)
        .eq('user_id', targetUserId);

      if (error) throw error;

      const loadedPlaylists: Playlist[] = data.map(p => ({
        id: p.id,
        name: p.name,
        userId: p.user_id,
        shows: p.playlist_shows.map((ps: any) => ps.show_id),
        isPublic: p.is_public,
        createdAt: new Date(p.created_at),
      }));

      setPlaylists(loadedPlaylists);
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(loadedPlaylists));
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  }, []);

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

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    return newPost;
  }, [posts]);

  const likePost = useCallback(async (postId: string) => {
    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, likes: post.likes + 1, isLiked: true }
        : post
    );
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
  }, [posts]);

  const unlikePost = useCallback(async (postId: string) => {
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      const updatedUserData = {
        ...userData,
        following: [...userData.following, userId],
      };
      setUserData(updatedUserData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }, [userData]);

  const unfollowUser = useCallback(async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      const updatedUserData = {
        ...userData,
        following: userData.following.filter(id => id !== userId),
      };
      setUserData(updatedUserData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }, [userData]);

  const isFollowing = useCallback((userId: string): boolean => {
    return userData.following.includes(userId);
  }, [userData.following]);

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
        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
