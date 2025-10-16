
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, Show, User } from '@/types';
import { mockPosts, mockUsers, currentUser as mockCurrentUser } from '@/data/mockData';

// Storage keys
const STORAGE_KEYS = {
  WATCHLISTS: '@app/watchlists',
  POSTS: '@app/posts',
  USER_DATA: '@app/user_data',
  FOLLOWING: '@app/following',
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

  // Initialize data from AsyncStorage
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
        // Convert date strings back to Date objects
        const watchlistsWithDates = parsedWatchlists.map((wl: any) => ({
          ...wl,
          createdAt: new Date(wl.createdAt),
          updatedAt: new Date(wl.updatedAt),
        }));
        setWatchlists(watchlistsWithDates);
        console.log('Loaded watchlists from storage:', watchlistsWithDates.length);
      } else {
        // Initialize with default watchlist
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
        // Convert date strings back to Date objects
        const postsWithDates = parsedPosts.map((post: any) => ({
          ...post,
          timestamp: new Date(post.timestamp),
        }));
        setPosts(postsWithDates);
        console.log('Loaded posts from storage:', postsWithDates.length);
      } else {
        // Initialize with mock posts
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
        // Initialize with mock user data
        const initialUserData: UserData = {
          following: mockCurrentUser.following || [],
          followers: mockCurrentUser.followers || [],
        };
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(initialUserData));
        console.log('Initialized with mock user data');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
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
    console.log('Created new post:', newPost.id);
    
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
    console.log(`Reposted post ${postId}`);
  };

  const unrepostPost = async (postId: string): Promise<void> => {
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
    console.log(`Unreposted post ${postId}`);
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
