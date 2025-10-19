
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, Show, User, Playlist } from '@/types';
import { mockPosts, mockUsers, currentUser as mockCurrentUser } from '@/data/mockData';
import { supabase } from '@/app/integrations/supabase/client';

// Storage keys
const STORAGE_KEYS = {
  POSTS: '@app/posts',
  USER_DATA: '@app/user_data',
  FOLLOWING: '@app/following',
  COMMENT_COUNTS: '@app/comment_counts',
  REPOSTS: '@app/reposts',
};

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
  // Playlists
  playlists: Playlist[];
  createPlaylist: (name: string, showId?: string) => Promise<Playlist>;
  addShowToPlaylist: (playlistId: string, showId: string) => Promise<void>;
  removeShowFromPlaylist: (playlistId: string, showId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  isShowInPlaylist: (playlistId: string, showId: string) => boolean;
  updatePlaylistPrivacy: (playlistId: string, isPublic: boolean) => Promise<void>;
  loadPlaylists: (userId?: string) => Promise<void>;
  
  // Posts
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
  
  // User data
  currentUser: User;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  
  // Loading state
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(mockCurrentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [userReposts, setUserReposts] = useState<RepostData[]>([]);
  const [allReposts, setAllReposts] = useState<RepostData[]>([]);

  // Load playlists from Supabase
  const loadPlaylists = useCallback(async (userId?: string) => {
    try {
      console.log('Loading playlists from Supabase...');
      
      // Get the authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        console.log('No authenticated user, using mock user ID');
        // Use mock user ID for development
        const targetUserId = userId || mockCurrentUser.id;
        
        // For now, load from local state only if no auth
        // In production, you'd want to handle this differently
        return;
      }

      const targetUserId = userId || authUser.id;
      
      // Fetch playlists from Supabase
      let query = supabase
        .from('playlists')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading playlists:', error);
        return;
      }

      if (data) {
        // Fetch playlist shows for each playlist
        const playlistsWithShows = await Promise.all(
          data.map(async (playlist) => {
            const { data: showsData, error: showsError } = await supabase
              .from('playlist_shows')
              .select('show_id')
              .eq('playlist_id', playlist.id);

            if (showsError) {
              console.error('Error loading playlist shows:', showsError);
              return {
                id: playlist.id,
                userId: playlist.user_id,
                name: playlist.name,
                isPublic: playlist.is_public,
                showCount: playlist.show_count || 0,
                shows: [],
                createdAt: new Date(playlist.created_at),
              };
            }

            return {
              id: playlist.id,
              userId: playlist.user_id,
              name: playlist.name,
              isPublic: playlist.is_public,
              showCount: showsData?.length || 0,
              shows: showsData?.map((s) => s.show_id) || [],
              createdAt: new Date(playlist.created_at),
            };
          })
        );

        setPlaylists(playlistsWithShows);
        console.log('Loaded playlists from Supabase:', playlistsWithShows.length);
      }
    } catch (error) {
      console.error('Error in loadPlaylists:', error);
    }
  }, []);

  const loadRepostsFromSupabase = useCallback(async () => {
    try {
      // Try to load all reposts from Supabase
      const { data, error } = await supabase
        .from('reposts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error fetching reposts from Supabase (might not be authenticated):', error.message);
        return;
      }

      if (data && data.length > 0) {
        const repostData: RepostData[] = data.map((r: any) => ({
          postId: r.original_post_id,
          userId: r.user_id,
          timestamp: new Date(r.created_at),
        }));
        
        setAllReposts(repostData);
        
        // Filter for current user
        const currentUserReposts = repostData.filter(r => r.userId === mockCurrentUser.id);
        setUserReposts(currentUserReposts);
        
        console.log('Loaded reposts from Supabase - Total:', repostData.length, 'User:', currentUserReposts.length);
      }
    } catch (error) {
      console.log('Error in loadRepostsFromSupabase:', error);
    }
  }, []);

  const loadRepostsFromStorage = useCallback(async () => {
    try {
      const repostsData = await AsyncStorage.getItem(STORAGE_KEYS.REPOSTS);
      if (repostsData) {
        const parsedReposts = JSON.parse(repostsData);
        const repostsWithDates = parsedReposts.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        }));
        
        // Only use storage reposts if we don't have Supabase data
        if (allReposts.length === 0) {
          setAllReposts(repostsWithDates);
          const currentUserReposts = repostsWithDates.filter((r: RepostData) => r.userId === mockCurrentUser.id);
          setUserReposts(currentUserReposts);
          console.log('Loaded reposts from storage - Total:', repostsWithDates.length, 'User:', currentUserReposts.length);
        }
      }
    } catch (error) {
      console.error('Error loading reposts from storage:', error);
    }
  }, [allReposts.length]);

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load playlists from Supabase
      await loadPlaylists();

      // Load posts
      const postsData = await AsyncStorage.getItem(STORAGE_KEYS.POSTS);
      if (postsData) {
        const parsedPosts = JSON.parse(postsData);
        const postsWithDates = parsedPosts.map((post: any) => ({
          ...post,
          timestamp: new Date(post.timestamp),
        }));
        setPosts(postsWithDates);
        console.log('Loaded posts from storage:', postsWithDates.length);
      } else {
        setPosts(mockPosts);
        await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(mockPosts));
        console.log('Initialized with mock posts');
      }

      // Load user data
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        const parsedUserData: UserData = JSON.parse(userData);
        setCurrentUser({
          ...mockCurrentUser,
          following: parsedUserData.following,
          followers: parsedUserData.followers,
        });
        console.log('Loaded user data from storage');
      } else {
        const initialUserData: UserData = {
          following: mockCurrentUser.following || [],
          followers: mockCurrentUser.followers || [],
        };
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(initialUserData));
        console.log('Initialized with mock user data');
      }

      // Load reposts from both Supabase and AsyncStorage
      await loadRepostsFromSupabase();
      await loadRepostsFromStorage();
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadPlaylists, loadRepostsFromSupabase, loadRepostsFromStorage]);

  // Initialize data from AsyncStorage and Supabase
  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveRepostsToStorage = async (reposts: RepostData[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REPOSTS, JSON.stringify(reposts));
    } catch (error) {
      console.error('Error saving reposts to storage:', error);
    }
  };

  // Playlist functions
  const createPlaylist = async (name: string, showId?: string): Promise<Playlist> => {
    try {
      console.log('Creating playlist:', name, showId ? `with show ${showId}` : '');
      
      // Get the authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        console.log('No authenticated user, creating local playlist only');
        // Fallback to local storage for development
        const newPlaylist: Playlist = {
          id: `playlist-${Date.now()}`,
          userId: mockCurrentUser.id,
          name: name.trim(),
          isPublic: true,
          showCount: showId ? 1 : 0,
          shows: showId ? [showId] : [],
          createdAt: new Date(),
        };
        
        setPlaylists([...playlists, newPlaylist]);
        return newPlaylist;
      }

      // Create playlist in Supabase
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .insert({
          user_id: authUser.id,
          name: name.trim(),
          is_public: true,
          show_count: showId ? 1 : 0,
        })
        .select()
        .single();

      if (playlistError) {
        console.error('Error creating playlist:', playlistError);
        throw playlistError;
      }

      // If showId provided, add it to the playlist
      if (showId && playlistData) {
        const { error: showError } = await supabase
          .from('playlist_shows')
          .insert({
            playlist_id: playlistData.id,
            show_id: showId,
          });

        if (showError) {
          console.error('Error adding show to playlist:', showError);
        }
      }

      const newPlaylist: Playlist = {
        id: playlistData.id,
        userId: playlistData.user_id,
        name: playlistData.name,
        isPublic: playlistData.is_public,
        showCount: showId ? 1 : 0,
        shows: showId ? [showId] : [],
        createdAt: new Date(playlistData.created_at),
      };

      setPlaylists([...playlists, newPlaylist]);
      console.log('Created playlist successfully:', newPlaylist.id);
      
      return newPlaylist;
    } catch (error) {
      console.error('Error in createPlaylist:', error);
      throw error;
    }
  };

  const addShowToPlaylist = async (playlistId: string, showId: string): Promise<void> => {
    try {
      console.log('Adding show to playlist:', playlistId, showId);
      
      // Check if already in playlist
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist?.shows?.includes(showId)) {
        console.log('Show already in playlist');
        return;
      }

      // Add to Supabase
      const { error } = await supabase
        .from('playlist_shows')
        .insert({
          playlist_id: playlistId,
          show_id: showId,
        });

      if (error) {
        console.error('Error adding show to playlist:', error);
        // Continue with local update even if Supabase fails
      }

      // Update show count
      const { error: updateError } = await supabase
        .from('playlists')
        .update({ show_count: (playlist?.showCount || 0) + 1 })
        .eq('id', playlistId);

      if (updateError) {
        console.error('Error updating playlist show count:', updateError);
      }

      // Update local state
      const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            shows: [...(p.shows || []), showId],
            showCount: (p.showCount || 0) + 1,
          };
        }
        return p;
      });

      setPlaylists(updatedPlaylists);
      console.log('Added show to playlist successfully');
    } catch (error) {
      console.error('Error in addShowToPlaylist:', error);
    }
  };

  const removeShowFromPlaylist = async (playlistId: string, showId: string): Promise<void> => {
    try {
      console.log('Removing show from playlist:', playlistId, showId);
      
      // Remove from Supabase
      const { error } = await supabase
        .from('playlist_shows')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('show_id', showId);

      if (error) {
        console.error('Error removing show from playlist:', error);
        // Continue with local update even if Supabase fails
      }

      // Update show count
      const playlist = playlists.find(p => p.id === playlistId);
      const { error: updateError } = await supabase
        .from('playlists')
        .update({ show_count: Math.max(0, (playlist?.showCount || 1) - 1) })
        .eq('id', playlistId);

      if (updateError) {
        console.error('Error updating playlist show count:', updateError);
      }

      // Update local state
      const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            shows: (p.shows || []).filter(id => id !== showId),
            showCount: Math.max(0, (p.showCount || 1) - 1),
          };
        }
        return p;
      });

      setPlaylists(updatedPlaylists);
      console.log('Removed show from playlist successfully');
    } catch (error) {
      console.error('Error in removeShowFromPlaylist:', error);
    }
  };

  const deletePlaylist = async (playlistId: string): Promise<void> => {
    try {
      console.log('Deleting playlist:', playlistId);
      
      // Delete from Supabase (cascade will handle playlist_shows)
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) {
        console.error('Error deleting playlist:', error);
        // Continue with local update even if Supabase fails
      }

      // Update local state
      const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
      setPlaylists(updatedPlaylists);
      console.log('Deleted playlist successfully');
    } catch (error) {
      console.error('Error in deletePlaylist:', error);
    }
  };

  const updatePlaylistPrivacy = async (playlistId: string, isPublic: boolean): Promise<void> => {
    try {
      console.log('Updating playlist privacy:', playlistId, isPublic);
      
      // Update in Supabase
      const { error } = await supabase
        .from('playlists')
        .update({ is_public: isPublic })
        .eq('id', playlistId);

      if (error) {
        console.error('Error updating playlist privacy:', error);
        // Continue with local update even if Supabase fails
      }

      // Update local state
      const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId) {
          return { ...p, isPublic };
        }
        return p;
      });

      setPlaylists(updatedPlaylists);
      console.log('Updated playlist privacy successfully');
    } catch (error) {
      console.error('Error in updatePlaylistPrivacy:', error);
    }
  };

  const isShowInPlaylist = (playlistId: string, showId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist ? (playlist.shows || []).includes(showId) : false;
  };

  // Post functions
  const createPost = async (postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'reposts' | 'isLiked'>): Promise<Post> => {
    const newPost: Post = {
      ...postData,
      id: `post-${Date.now()}`,
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      reposts: 0,
      isLiked: false,
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
    console.log('Created new post:', newPost.id, 'Total posts:', updatedPosts.length);
    
    return newPost;
  };

  const likePost = async (postId: string): Promise<void> => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId && !post.isLiked) {
        return {
          ...post,
          likes: post.likes + 1,
          isLiked: true,
        };
      }
      return post;
    });

    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
    console.log(`Liked post ${postId}`);
  };

  const unlikePost = async (postId: string): Promise<void> => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId && post.isLiked) {
        return {
          ...post,
          likes: Math.max(0, post.likes - 1),
          isLiked: false,
        };
      }
      return post;
    });

    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
    console.log(`Unliked post ${postId}`);
  };

  const repostPost = async (postId: string): Promise<void> => {
    try {
      console.log('=== REPOST POST START ===');
      console.log('Post ID:', postId);
      
      const userId = mockCurrentUser.id;
      console.log('User ID:', userId);

      // Check if already reposted
      const alreadyReposted = userReposts.some(r => r.postId === postId);
      if (alreadyReposted) {
        console.log('Already reposted, skipping');
        return;
      }

      // Try to insert into Supabase first
      let supabaseSuccess = false;
      try {
        const { data, error } = await supabase
          .from('reposts')
          .insert({
            user_id: userId,
            original_post_id: postId,
          })
          .select()
          .single();

        if (!error && data) {
          console.log('✅ Repost saved to Supabase:', data);
          supabaseSuccess = true;
        } else {
          console.log('⚠️ Supabase insert failed (might not be authenticated):', error?.message);
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase error:', supabaseError);
      }

      // Always save to local state regardless of Supabase success
      const newRepost: RepostData = {
        postId,
        userId,
        timestamp: new Date(),
      };
      
      const updatedUserReposts = [...userReposts, newRepost];
      const updatedAllReposts = [...allReposts, newRepost];
      
      setUserReposts(updatedUserReposts);
      setAllReposts(updatedAllReposts);
      
      // Save to AsyncStorage
      await saveRepostsToStorage(updatedAllReposts);

      // Update post repost count
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            reposts: post.reposts + 1,
          };
        }
        return post;
      });

      setPosts(updatedPosts);
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      
      console.log('✅ Repost saved locally');
      console.log('New repost count:', updatedPosts.find(p => p.id === postId)?.reposts);
      console.log('User reposts:', updatedUserReposts.length);
      console.log('=== REPOST POST END ===');
    } catch (error) {
      console.error('❌ Error in repostPost:', error);
    }
  };

  const unrepostPost = async (postId: string): Promise<void> => {
    try {
      console.log('=== UNREPOST POST START ===');
      console.log('Post ID:', postId);
      
      const userId = mockCurrentUser.id;
      console.log('User ID:', userId);

      // Try to delete from Supabase
      try {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('user_id', userId)
          .eq('original_post_id', postId);

        if (!error) {
          console.log('✅ Repost deleted from Supabase');
        } else {
          console.log('⚠️ Supabase delete failed:', error.message);
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase error:', supabaseError);
      }

      // Always update local state
      const updatedUserReposts = userReposts.filter(r => r.postId !== postId);
      const updatedAllReposts = allReposts.filter(r => !(r.postId === postId && r.userId === userId));
      
      setUserReposts(updatedUserReposts);
      setAllReposts(updatedAllReposts);
      
      // Save to AsyncStorage
      await saveRepostsToStorage(updatedAllReposts);

      // Update post repost count
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            reposts: Math.max(0, post.reposts - 1),
          };
        }
        return post;
      });

      setPosts(updatedPosts);
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
      
      console.log('✅ Repost removed locally');
      console.log('New repost count:', updatedPosts.find(p => p.id === postId)?.reposts);
      console.log('User reposts:', updatedUserReposts.length);
      console.log('=== UNREPOST POST END ===');
    } catch (error) {
      console.error('❌ Error in unrepostPost:', error);
    }
  };

  const hasUserReposted = (postId: string): boolean => {
    const result = userReposts.some(r => r.postId === postId);
    return result;
  };

  const getUserReposts = (): Post[] => {
    // Get all posts that the user has reposted
    const repostedPostIds = userReposts.map(r => r.postId);
    return posts.filter(post => repostedPostIds.includes(post.id));
  };

  const getAllReposts = (): { post: Post; repostedBy: User; timestamp: Date }[] => {
    // Get all reposts with full post and user data
    const result: { post: Post; repostedBy: User; timestamp: Date }[] = [];
    
    for (const repost of allReposts) {
      const post = posts.find(p => p.id === repost.postId);
      const user = mockUsers.find(u => u.id === repost.userId) || mockCurrentUser;
      
      if (post) {
        result.push({
          post,
          repostedBy: user,
          timestamp: repost.timestamp,
        });
      }
    }
    
    return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const updateCommentCount = async (postId: string, count: number): Promise<void> => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: count,
        };
      }
      return post;
    });

    setPosts(updatedPosts);
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
    console.log(`Updated comment count for post ${postId} to ${count}`);
  };

  const getPost = (postId: string): Post | undefined => {
    return posts.find(post => post.id === postId);
  };

  // User functions
  const followUser = async (userId: string): Promise<void> => {
    if (!currentUser.following?.includes(userId)) {
      const updatedFollowing = [...(currentUser.following || []), userId];
      const updatedUser = {
        ...currentUser,
        following: updatedFollowing,
      };
      setCurrentUser(updatedUser);
      
      const userData: UserData = {
        following: updatedFollowing,
        followers: currentUser.followers || [],
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      console.log(`Followed user ${userId}`);
    }
  };

  const unfollowUser = async (userId: string): Promise<void> => {
    if (currentUser.following?.includes(userId)) {
      const updatedFollowing = currentUser.following.filter(id => id !== userId);
      const updatedUser = {
        ...currentUser,
        following: updatedFollowing,
      };
      setCurrentUser(updatedUser);
      
      const userData: UserData = {
        following: updatedFollowing,
        followers: currentUser.followers || [],
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      console.log(`Unfollowed user ${userId}`);
    }
  };

  const isFollowing = (userId: string): boolean => {
    return currentUser.following?.includes(userId) || false;
  };

  const value: DataContextType = {
    // Playlists
    playlists,
    createPlaylist,
    addShowToPlaylist,
    removeShowFromPlaylist,
    deletePlaylist,
    isShowInPlaylist,
    updatePlaylistPrivacy,
    loadPlaylists,
    
    // Posts
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
    
    // User data
    currentUser,
    followUser,
    unfollowUser,
    isFollowing,
    
    // Loading state
    isLoading,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
