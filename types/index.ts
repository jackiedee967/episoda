
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  episodesWatchedCount?: number;
  totalLikesReceived?: number;
  isOnline?: boolean;
  lastActiveAt?: Date;
  socialLinks?: SocialLink[];
  is_admin?: boolean;
}

export interface SocialLink {
  platform: 'instagram' | 'tiktok' | 'x' | 'spotify' | 'website';
  url: string;
}

export interface Show {
  id: string;
  traktId: number;
  title: string;
  year?: number;
  endYear?: number;
  poster: string | null;
  backdrop?: string | null;
  description: string;
  rating: number;
  totalSeasons: number;
  totalEpisodes: number;
  friendsWatching: number;
  colorScheme?: string | null;
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
  thumbnail?: string;
  firstAired?: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId?: string | null;
  user: User;
  comment_text: string;
  image?: string;
  likes: number;
  isLiked: boolean;
  timestamp: Date;
  replies: Comment[];
  depth?: number;
}

export interface Post {
  id: string;
  user: User;
  show: Show;
  episode?: Episode; // Legacy single episode (backwards compatibility)
  episodes?: Episode[]; // New multi-episode posts
  rewatchEpisodeIds?: string[]; // IDs of episodes that are rewatches
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

export interface RepostContext {
  repostedBy: User;
  repostedAt: Date;
  isSelfRepost: boolean;
}

export interface FeedItem {
  post: Post;
  repostContext?: RepostContext;
  sortTimestamp: Date;
}

export type PostTag = 'spoiler alert' | 'fan theory' | 'discussion' | 'episode recap' | 'misc';

export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'follow' 
  | 'repost'
  | 'friend_follow'
  | 'friend_like'
  | 'friend_comment'
  | 'friend_post'
  | 'mention_comment'
  | 'mention_post'
  | 'admin_announcement';

export interface Notification {
  id: string;
  type: NotificationType;
  actor: User;
  timestamp: Date;
  read: boolean;
  post?: Post;
  comment?: Comment;
  targetUser?: User;
  show?: Show;
  episode?: Episode;
  helpDeskPost?: HelpDeskPost; // For admin_announcement type
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  showCount: number;
  shows?: string[];
  createdAt: Date;
}

export interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  admin_announcements: boolean;
  friend_logs_watched_show: boolean;
  friend_logs_playlist_show: boolean;
}

export interface BlockedUser {
  id: string;
  blockedUser: User;
  blockedAt: Date;
}

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';

export type HelpDeskCategory = 'Feature Request' | 'Support' | 'Feedback' | 'Misc' | 'Admin Announcement';

export interface HelpDeskPost {
  id: string;
  user_id: string;
  username: string;
  avatar?: string;
  title: string;
  details: string;
  category: HelpDeskCategory;
  section: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  isLiked?: boolean;
}

export interface HelpDeskComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar?: string;
  comment_text: string;
  created_at: string;
  parent_comment_id?: string | null;
  likes: number;
  isLiked: boolean;
  replies?: HelpDeskComment[];
}
