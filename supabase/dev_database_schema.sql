-- EPISODA Development Database Schema
-- Run this in your EPISODA-Dev Supabase SQL Editor to set up the dev database
-- Generated from migration files - run in order

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  birthday DATE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  avatar_color_scheme INTEGER DEFAULT 1,
  avatar_icon VARCHAR(50) DEFAULT 'icon-1-ellipse',
  phone_number VARCHAR(20),
  expo_push_token TEXT,
  notification_preferences JSONB DEFAULT '{"likes": true, "comments": true, "follows": true, "mentions": true, "admin_announcements": true, "friend_logs_watched_show": true, "friend_logs_playlist_show": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create social_links table
CREATE TABLE IF NOT EXISTS social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ============================================
-- 2. SHOWS & EPISODES
-- ============================================

CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trakt_id INTEGER NOT NULL UNIQUE,
  imdb_id VARCHAR(20),
  tvdb_id INTEGER,
  tmdb_id INTEGER,
  tvmaze_id INTEGER,
  title VARCHAR(500) NOT NULL,
  year INTEGER,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  rating DECIMAL(3,1),
  total_seasons INTEGER,
  total_episodes INTEGER,
  color_scheme TEXT,
  genres TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  trakt_id INTEGER,
  imdb_id VARCHAR(20),
  tvdb_id INTEGER,
  tmdb_id INTEGER,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  rating DECIMAL(3,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(show_id, season_number, episode_number)
);

-- ============================================
-- 3. POSTS & INTERACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  show_id TEXT,
  show_title TEXT,
  show_poster TEXT,
  episode_ids TEXT[] DEFAULT '{}',
  rewatch_episode_ids TEXT[] DEFAULT '{}',
  title TEXT,
  body TEXT NOT NULL,
  rating DECIMAL(3,1),
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- ============================================
-- 4. PLAYLISTS & WATCH HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  show_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  show_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, show_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  show_id TEXT NOT NULL,
  episode_id TEXT,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  is_rewatch BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS show_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  show_id TEXT NOT NULL,
  rating DECIMAL(3,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, show_id)
);

-- ============================================
-- 5. MENTIONS & NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  mentioned_username VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  mentioned_username VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_social_links_user_id ON social_links(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_shows_trakt_id ON shows(trakt_id);
CREATE INDEX IF NOT EXISTS idx_shows_imdb_id ON shows(imdb_id);
CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_episodes_trakt_id ON episodes(trakt_id);
CREATE INDEX IF NOT EXISTS idx_episodes_lookup ON episodes(show_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON post_reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_user_id ON post_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_shows_playlist_id ON playlist_shows(playlist_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_show_id ON watch_history(show_id);
CREATE INDEX IF NOT EXISTS idx_show_ratings_user_id ON show_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_show_ratings_show_id ON show_ratings(show_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_post_mentions_post_id ON post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_mentioned_user_id ON post_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_id ON post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Social links
CREATE POLICY "Social links are viewable by everyone" ON social_links FOR SELECT USING (true);
CREATE POLICY "Users can manage their own social links" ON social_links FOR ALL USING (auth.uid() = user_id);

-- Follows
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON follows FOR ALL USING (auth.uid() = follower_id);

-- Shows
CREATE POLICY "Authenticated users can read shows" ON shows FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert shows" ON shows FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Episodes
CREATE POLICY "Authenticated users can read episodes" ON episodes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert episodes" ON episodes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Posts
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Post likes
CREATE POLICY "Post likes are viewable by everyone" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own post likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

-- Post reposts
CREATE POLICY "Post reposts are viewable by everyone" ON post_reposts FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reposts" ON post_reposts FOR ALL USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment likes
CREATE POLICY "Comment likes are viewable by everyone" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comment likes" ON comment_likes FOR ALL USING (auth.uid() = user_id);

-- Playlists
CREATE POLICY "Public playlists are viewable by everyone" ON playlists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own playlists" ON playlists FOR ALL USING (auth.uid() = user_id);

-- Playlist shows
CREATE POLICY "Playlist shows viewable if playlist is public or owned" ON playlist_shows FOR SELECT USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_shows.playlist_id AND (playlists.is_public = true OR playlists.user_id = auth.uid()))
);
CREATE POLICY "Users can manage playlist shows they own" ON playlist_shows FOR ALL USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_shows.playlist_id AND playlists.user_id = auth.uid())
);

-- Watch history
CREATE POLICY "Users can view their own watch history" ON watch_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own watch history" ON watch_history FOR ALL USING (auth.uid() = user_id);

-- Show ratings
CREATE POLICY "Show ratings are viewable by everyone" ON show_ratings FOR SELECT USING (true);
CREATE POLICY "Users can manage their own show ratings" ON show_ratings FOR ALL USING (auth.uid() = user_id);

-- Post mentions
CREATE POLICY "Post mentions are viewable by everyone" ON post_mentions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create post mentions" ON post_mentions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Comment mentions
CREATE POLICY "Comment mentions are viewable by everyone" ON comment_mentions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comment mentions" ON comment_mentions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications (SECURE - actor_id must match authenticated user to prevent spoofing)
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create notifications as themselves" ON notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reports
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Authenticated users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Post reports
CREATE POLICY "Users can view their own post reports" ON post_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Authenticated users can create post reports" ON post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ============================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_show_ratings_updated_at BEFORE UPDATE ON show_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Anyone can view profile pictures" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own profile pictures" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own profile pictures" ON storage.objects FOR DELETE USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public read access for avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 12. ADDITIONAL TABLES (PROD SYNC)
-- ============================================

-- Blocks table
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

-- Help desk posts
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

-- Help desk comments
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

-- Help desk likes
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

-- Notification preferences table
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

-- Replies table
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

-- Reply likes table
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

-- Reposts table
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

-- User profiles cache table
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

-- Additional triggers
CREATE TRIGGER update_help_desk_posts_updated_at BEFORE UPDATE ON help_desk_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. ADMIN COLUMN PROTECTION
-- ============================================

-- Trigger function to protect admin-only columns from non-admin users
CREATE OR REPLACE FUNCTION protect_admin_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_admin BOOLEAN;
BEGIN
  SELECT COALESCE(is_admin, FALSE) INTO current_user_admin
  FROM profiles
  WHERE user_id = auth.uid();
  
  current_user_admin := COALESCE(current_user_admin, FALSE);
  
  IF NOT current_user_admin THEN
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify is_admin column';
    END IF;
    
    IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify is_suspended column';
    END IF;
    
    IF OLD.suspended_at IS DISTINCT FROM NEW.suspended_at THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify suspended_at column';
    END IF;
    
    IF OLD.suspended_reason IS DISTINCT FROM NEW.suspended_reason THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify suspended_reason column';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_admin_columns ON profiles;

CREATE TRIGGER protect_profiles_admin_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_admin_columns();

-- Trigger to prevent non-admins from setting admin columns on INSERT
CREATE OR REPLACE FUNCTION protect_admin_columns_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_admin BOOLEAN;
BEGIN
  SELECT COALESCE(is_admin, FALSE) INTO current_user_admin
  FROM profiles
  WHERE user_id = auth.uid();
  
  current_user_admin := COALESCE(current_user_admin, FALSE);
  
  IF NOT current_user_admin THEN
    IF NEW.is_admin = TRUE THEN
      RAISE EXCEPTION 'Unauthorized: Cannot set is_admin on profile creation';
    END IF;
    
    IF NEW.is_suspended = TRUE THEN
      RAISE EXCEPTION 'Unauthorized: Cannot set is_suspended on profile creation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_admin_columns_insert ON profiles;

CREATE TRIGGER protect_profiles_admin_columns_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_admin_columns_insert();

-- ============================================
-- DONE! Your dev database is ready.
-- Complete with all 24 tables matching production.
-- ============================================
