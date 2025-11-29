-- Migration: Sync Production Missing Tables
-- Date: 2024-11-29
-- Description: Adds 9 tables that exist in production but were missing from dev
-- Tables: blocks, help_desk_comments, help_desk_likes, help_desk_posts, 
--         notification_preferences, replies, reply_likes, reposts, user_profiles

-- ============================================
-- 1. BLOCKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks" ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can create blocks" ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete their own blocks" ON blocks FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================
-- 2. HELP DESK TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS help_desk_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  category TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_desk_posts_user_id ON help_desk_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_help_desk_posts_category ON help_desk_posts(category);
CREATE INDEX IF NOT EXISTS idx_help_desk_posts_created_at ON help_desk_posts(created_at DESC);

ALTER TABLE help_desk_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Help desk posts are viewable by everyone" ON help_desk_posts FOR SELECT USING (true);
CREATE POLICY "Users can create help desk posts" ON help_desk_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own help desk posts" ON help_desk_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own help desk posts" ON help_desk_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS help_desk_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES help_desk_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_desk_comments_post_id ON help_desk_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_help_desk_comments_user_id ON help_desk_comments(user_id);

ALTER TABLE help_desk_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Help desk comments are viewable by everyone" ON help_desk_comments FOR SELECT USING (true);
CREATE POLICY "Users can create help desk comments" ON help_desk_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own help desk comments" ON help_desk_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS help_desk_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES help_desk_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_help_desk_likes_post_id ON help_desk_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_help_desk_likes_user_id ON help_desk_likes(user_id);

ALTER TABLE help_desk_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Help desk likes are viewable by everyone" ON help_desk_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own help desk likes" ON help_desk_likes FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. NOTIFICATION PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(user_id) ON DELETE CASCADE,
  new_follower BOOLEAN DEFAULT TRUE,
  post_liked BOOLEAN DEFAULT TRUE,
  post_commented BOOLEAN DEFAULT TRUE,
  comment_replied BOOLEAN DEFAULT TRUE,
  mentioned BOOLEAN DEFAULT TRUE,
  friend_posted BOOLEAN DEFAULT TRUE,
  friend_activity BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 4. REPLIES & REPLY LIKES TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_comment_id ON replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_replies_user_id ON replies(user_id);

ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies are viewable by everyone" ON replies FOR SELECT USING (true);
CREATE POLICY "Users can create replies" ON replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own replies" ON replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies" ON replies FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reply_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id ON reply_likes(user_id);

ALTER TABLE reply_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reply likes are viewable by everyone" ON reply_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reply likes" ON reply_likes FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. REPOSTS TABLE (Alternative to post_reposts)
-- ============================================

CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  original_post_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, original_post_id)
);

CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_original_post_id ON reposts(original_post_id);

ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reposts are viewable by everyone" ON reposts FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reposts" ON reposts FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 6. USER PROFILES TABLE (Cache/View table)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(user_id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  social_links JSONB,
  episodes_watched INTEGER DEFAULT 0,
  total_likes_received INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User profiles are viewable by everyone" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage their own user profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_help_desk_posts_updated_at BEFORE UPDATE ON help_desk_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! 9 missing tables added.
-- ============================================
