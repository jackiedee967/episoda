
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
