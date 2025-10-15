
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
}

export interface Show {
  id: string;
  title: string;
  poster: string;
  description: string;
  rating: number;
  totalSeasons: number;
  totalEpisodes: number;
  friendsWatching: number;
}

export interface Episode {
  id: string;
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  rating: number;
  postCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  user: User;
  text: string;
  image?: string;
  likes: number;
  isLiked: boolean;
  timestamp: Date;
  replies: Reply[];
}

export interface Reply {
  id: string;
  commentId: string;
  user: User;
  text: string;
  image?: string;
  likes: number;
  isLiked: boolean;
  timestamp: Date;
}

export interface Post {
  id: string;
  user: User;
  show: Show;
  episodes?: Episode[];
  title?: string;
  body: string;
  rating?: number;
  tags: string[];
  likes: number;
  comments: number;
  reposts: number;
  timestamp: Date;
  isLiked: boolean;
  isSpoiler: boolean;
}

export type PostTag = 'spoiler alert' | 'fan theory' | 'discussion' | 'episode recap' | 'misc';
