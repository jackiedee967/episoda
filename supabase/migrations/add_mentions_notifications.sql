-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'mention_comment', 'mention_post', 'like', 'comment', etc.
  actor_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE, -- who performed the action
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comment_mentions table
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  mentioned_username VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)
);

-- Create post_mentions table
CREATE TABLE IF NOT EXISTS post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  mentioned_username VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_post_id ON post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_mentioned_user_id ON post_mentions(mentioned_user_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
  ON notifications FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for comment_mentions
CREATE POLICY "Comment mentions are viewable by everyone" 
  ON comment_mentions FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create comment mentions" 
  ON comment_mentions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for post_mentions
CREATE POLICY "Post mentions are viewable by everyone" 
  ON post_mentions FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create post mentions" 
  ON post_mentions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'User notifications for mentions, likes, comments, etc.';
COMMENT ON TABLE comment_mentions IS 'Tracks user mentions in comments';
COMMENT ON TABLE post_mentions IS 'Tracks user mentions in posts';
