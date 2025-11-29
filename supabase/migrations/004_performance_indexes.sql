-- Performance Indexes for 1M+ Users Scale
-- Run this in BOTH EPISODA-Dev and EPISODA-Prod SQL Editor

-- ============================================
-- POSTS - High traffic table
-- ============================================

-- Feed queries: Get posts by user, ordered by date
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
  ON posts(user_id, created_at DESC);

-- Timeline queries: Get recent posts globally
CREATE INDEX IF NOT EXISTS idx_posts_created_desc 
  ON posts(created_at DESC);

-- Show-specific feeds
CREATE INDEX IF NOT EXISTS idx_posts_show_created 
  ON posts(show_id, created_at DESC);

-- ============================================
-- NOTIFICATIONS - Critical for push notifications
-- ============================================

-- Unread notifications query (most common)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC);

-- Actor lookups for notification grouping
CREATE INDEX IF NOT EXISTS idx_notifications_actor 
  ON notifications(actor_id, created_at DESC);

-- Type-based filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(user_id, type, created_at DESC);

-- ============================================
-- COMMENTS - Nested comments are expensive
-- ============================================

-- Parent comment lookups (for nested replies)
CREATE INDEX IF NOT EXISTS idx_comments_parent 
  ON comments(parent_comment_id, created_at DESC);

-- Post comments with ordering
CREATE INDEX IF NOT EXISTS idx_comments_post_created 
  ON comments(post_id, created_at DESC);

-- User's comments
CREATE INDEX IF NOT EXISTS idx_comments_user_created 
  ON comments(user_id, created_at DESC);

-- ============================================
-- FOLLOWS - Social graph queries
-- ============================================

-- Who follows this user (followers list)
CREATE INDEX IF NOT EXISTS idx_follows_following_created 
  ON follows(following_id, created_at DESC);

-- Mutual follows check (compound for efficiency)
CREATE INDEX IF NOT EXISTS idx_follows_compound 
  ON follows(follower_id, following_id);

-- ============================================
-- WATCH HISTORY - Recommendation engine
-- ============================================

-- User's watch history by recency
CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched 
  ON watch_history(user_id, watched_at DESC);

-- Show popularity (how many watched)
CREATE INDEX IF NOT EXISTS idx_watch_history_show_watched 
  ON watch_history(show_id, watched_at DESC);

-- Rewatch tracking
CREATE INDEX IF NOT EXISTS idx_watch_history_user_rewatch 
  ON watch_history(user_id, is_rewatch, watched_at DESC);

-- ============================================
-- PROFILES - User lookups
-- ============================================

-- Username search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
  ON profiles(LOWER(username));

-- Display name search
CREATE INDEX IF NOT EXISTS idx_profiles_display_lower 
  ON profiles(LOWER(display_name));

-- ============================================
-- POST_LIKES & POST_REPOSTS - Engagement metrics
-- ============================================

-- Count likes per post efficiently
CREATE INDEX IF NOT EXISTS idx_post_likes_post_created 
  ON post_likes(post_id, created_at DESC);

-- User's likes history
CREATE INDEX IF NOT EXISTS idx_post_likes_user_created 
  ON post_likes(user_id, created_at DESC);

-- Count reposts per post
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_created 
  ON post_reposts(post_id, created_at DESC);

-- ============================================
-- PLAYLISTS - Discovery features
-- ============================================

-- Public playlists discovery
CREATE INDEX IF NOT EXISTS idx_playlists_public_updated 
  ON playlists(is_public, updated_at DESC) WHERE is_public = true;

-- User's playlists
CREATE INDEX IF NOT EXISTS idx_playlists_user_updated 
  ON playlists(user_id, updated_at DESC);

-- ============================================
-- SHOWS - Search and discovery
-- ============================================

-- Title search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_shows_title_lower 
  ON shows(LOWER(title));

-- Rating-based discovery
CREATE INDEX IF NOT EXISTS idx_shows_rating 
  ON shows(rating DESC NULLS LAST);

-- ============================================
-- Done! These indexes optimize the most common queries.
-- ============================================
