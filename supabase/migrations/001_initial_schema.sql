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

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  show_id VARCHAR(100),
  episode_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reposts table
CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_social_links_user_id ON social_links(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON reposts(post_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for social_links
CREATE POLICY "Social links are viewable by everyone" 
  ON social_links FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage their own social links" 
  ON social_links FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Follows are viewable by everyone" 
  ON follows FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage their own follows" 
  ON follows FOR ALL 
  USING (auth.uid() = follower_id);

-- RLS Policies for posts
CREATE POLICY "Posts are viewable by everyone" 
  ON posts FOR SELECT 
  USING (true);

CREATE POLICY "Users can create their own posts" 
  ON posts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
  ON posts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
  ON posts FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Likes are viewable by everyone" 
  ON likes FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage their own likes" 
  ON likes FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone" 
  ON comments FOR SELECT 
  USING (true);

CREATE POLICY "Users can create comments" 
  ON comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
  ON comments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON comments FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for reposts
CREATE POLICY "Reposts are viewable by everyone" 
  ON reposts FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage their own reposts" 
  ON reposts FOR ALL 
  USING (auth.uid() = user_id);

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'User profile information';
COMMENT ON COLUMN profiles.avatar_color_scheme IS 'Color scheme ID (1-7) for auto-generated profile picture';
COMMENT ON COLUMN profiles.avatar_icon IS 'Icon name for auto-generated profile picture';
