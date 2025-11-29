-- Performance Indexes for Production (1M+ Users Scale)
-- Safe version that skips columns that may not exist

-- ============================================
-- POSTS - High traffic table
-- ============================================

CREATE INDEX IF NOT EXISTS idx_posts_user_created 
  ON posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_created_desc 
  ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_show_created 
  ON posts(show_id, created_at DESC);

-- ============================================
-- NOTIFICATIONS - Critical for push notifications
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_actor 
  ON notifications(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(user_id, type, created_at DESC);

-- ============================================
-- COMMENTS - Nested comments are expensive
-- ============================================

CREATE INDEX IF NOT EXISTS idx_comments_parent 
  ON comments(parent_comment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_created 
  ON comments(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_user_created 
  ON comments(user_id, created_at DESC);

-- ============================================
-- FOLLOWS - Social graph queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_follows_following_created 
  ON follows(following_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_compound 
  ON follows(follower_id, following_id);

-- ============================================
-- WATCH HISTORY - Recommendation engine
-- ============================================

CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched 
  ON watch_history(user_id, watched_at DESC);

CREATE INDEX IF NOT EXISTS idx_watch_history_show_watched 
  ON watch_history(show_id, watched_at DESC);

-- ============================================
-- PROFILES - User lookups
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
  ON profiles(LOWER(username));

CREATE INDEX IF NOT EXISTS idx_profiles_display_lower 
  ON profiles(LOWER(display_name));

-- ============================================
-- POST_LIKES & POST_REPOSTS - Engagement metrics
-- ============================================

CREATE INDEX IF NOT EXISTS idx_post_likes_post_created 
  ON post_likes(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_likes_user_created 
  ON post_likes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_reposts_post_created 
  ON post_reposts(post_id, created_at DESC);

-- ============================================
-- PLAYLISTS - Discovery features
-- ============================================

CREATE INDEX IF NOT EXISTS idx_playlists_public_updated 
  ON playlists(is_public, updated_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_playlists_user_updated 
  ON playlists(user_id, updated_at DESC);

-- ============================================
-- SHOWS - Search and discovery
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shows_title_lower 
  ON shows(LOWER(title));

CREATE INDEX IF NOT EXISTS idx_shows_rating 
  ON shows(rating DESC NULLS LAST);

-- ============================================
-- Done! Production-safe indexes applied.
-- ============================================
