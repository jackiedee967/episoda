
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, Show, User } from '@/types';
import { mockPosts, mockUsers, currentUser as mockCurrentUser } from '@/data/mockData';
import { supabase } from '@/app/integrations/supabase/client';

// Storage keys
const STORAGE_KEYS = {
  WATCHLISTS: '@app/watchlists',
  POSTS: '@app/posts',
  USER_DATA: '@app/user_data',
  FOLLOWING: '@app/following',
  COMMENT_COUNTS: '@app/comment_counts',
  REPOSTS: '@app/reposts',
};

export interface Watchlist {
  id: string;
  name: string;
  shows: string[];
  createdAt: Date;
  updatedAt: Date;
}

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
  // Watchlists
  watchlists: Watchlist[];
  createWatchlist: (name: string, showId?: string) => Promise<Watchlist>;
  addShowToWatchlist: (watchlistId: string, showId: string) => Promise<void>;
  removeShowFromWatchlist: (watchlistId: string, showId: string) => Promise<void>;
  deleteWatchlist: (watchlistId: string) => Promise<void>;
  isShowInWatchlist: (watchlistId: string, showId: string) => boolean;
  
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
  getAllReposts: () => Array<{ post: Post; repostedBy: User; timestamp: Date }>;
  
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
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(mockCurrentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [userReposts, setUserReposts] = useState<RepostData[]>([]);
  const [allReposts, setAllReposts] = useState<RepostData[]>([]);

  // Initialize data from AsyncStorage and Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load watchlists
      const watchlistsData = await AsyncStorage.getItem(STORAGE_KEYS.WATCHLISTS);
      if (watchlistsData) {
        const parsedWatchlists = JSON.parse(watchlistsData);
        const watchlistsWithDates = parsedWatchlists.map((wl: any) => ({
          ...wl,
          createdAt: new Date(wl.createdAt),
          updatedAt: new Date(wl.updatedAt),
        }));
        setWatchlists(watchlistsWithDates);
        console.log('Loaded watchlists from storage:', watchlistsWithDates.length);
      } else {
        const defaultWatchlist: Watchlist = {
          id: 'wl-default',
          name: 'Shows to Watch',
          shows: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setWatchlists([defaultWatchlist]);
        await AsyncStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify([defaultWatchlist]));
        console.log('Created default watchlist');
      }

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
  };

  const loadRepostsFromSupabase = async () => {
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
  };

  const loadRepostsFromStorage = async () => {
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
  };

  const saveRepostsToStorage = async (reposts: RepostData[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REPOSTS, JSON.stringify(reposts));
    } catch (error) {
      console.error('Error saving reposts to storage:', error);
    }
  };

  // Watchlist functions
  const createWatchlist = async (name: string, showId?: string): Promise<Watchlist> => {
    const newWatchlist: Watchlist = {
      id: `wl-${Date.now()}`,
      name: name.trim(),
      shows: showId ? [showId] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedWatchlists = [...watchlists, newWatchlist];
    setWatchlists(updatedWatchlists);
    await AsyncStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(updatedWatchlists));
    console.log(`Created watchlist: ${name}`, showId ? `with show ${showId}` : '');
    
    return newWatchlist;
  };

  const addShowToWatchlist = async (watchlistId: string, showId: string): Promise<void> => {
    const updatedWatchlists = watchlists.map(wl => {
      if (wl.id === watchlistId && !wl.shows.includes(showId)) {
        return {
          ...wl,
          shows: [...wl.shows, showId],
          updatedAt: new Date(),
        };
      }
      return wl;
    });

    setWatchlists(updatedWatchlists);
    await AsyncStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(updatedWatchlists));
    console.log(`Added show ${showId} to watchlist ${watchlistId}`);
  };

  const removeShowFromWatchlist = async (watchlistId: string, showId: string): Promise<void> => {
    const updatedWatchlists = watchlists.map(wl => {
      if (wl.id === watchlistId) {
        return {
          ...wl,
          shows: wl.shows.filter(id => id !== showId),
          updatedAt: new Date(),
        };
      }
      return wl;
    });

    setWatchlists(updatedWatchlists);
    await AsyncStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(updatedWatchlists));
    console.log(`Removed show ${showId} from watchlist ${watchlistId}`);
  };

  const deleteWatchlist = async (watchlistId: string): Promise<void> => {
    const updatedWatchlists = watchlists.filter(wl => wl.id !== watchlistId);
    setWatchlists(updatedWatchlists);
    await AsyncStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(updatedWatchlists));
    console.log(`Deleted watchlist ${watchlistId}`);
  };

  const isShowInWatchlist = (watchlistId: string, showId: string): boolean => {
    const watchlist = watchlists.find(wl => wl.id === watchlistId);
    return watchlist ? watchlist.shows.includes(showId) : false;
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

  const getAllReposts = (): Array<{ post: Post; repostedBy: User; timestamp: Date }> => {
    // Get all reposts with full post and user data
    const result: Array<{ post: Post; repostedBy: User; timestamp: Date }> = [];
    
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
    // Watchlists
    watchlists,
    createWatchlist,
    addShowToWatchlist,
    removeShowFromWatchlist,
    deleteWatchlist,
    isShowInWatchlist,
    
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
