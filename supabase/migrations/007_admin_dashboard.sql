-- Admin Dashboard Functions
-- Run this in BOTH Dev and Prod Supabase SQL Editor

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_is_admin BOOLEAN;
BEGIN
  SELECT COALESCE(is_admin, FALSE) INTO user_is_admin
  FROM profiles
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(user_is_admin, FALSE);
END;
$$;

-- Add is_admin column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Function to get admin dashboard stats (admin only)
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin authorization
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_users_7d', (
      SELECT COUNT(DISTINCT user_id) FROM posts 
      WHERE created_at > NOW() - INTERVAL '7 days'
    ),
    'active_users_30d', (
      SELECT COUNT(DISTINCT user_id) FROM posts 
      WHERE created_at > NOW() - INTERVAL '30 days'
    ),
    'total_posts', (SELECT COUNT(*) FROM posts),
    'posts_today', (
      SELECT COUNT(*) FROM posts 
      WHERE created_at > NOW() - INTERVAL '1 day'
    ),
    'posts_7d', (
      SELECT COUNT(*) FROM posts 
      WHERE created_at > NOW() - INTERVAL '7 days'
    ),
    'total_comments', (SELECT COUNT(*) FROM comments),
    'total_shows_logged', (SELECT COUNT(*) FROM shows),
    'total_episodes_watched', (SELECT COUNT(*) FROM watch_history),
    'total_playlists', (SELECT COUNT(*) FROM playlists),
    'pending_reports', (
      SELECT COUNT(*) FROM post_reports 
      WHERE status = 'pending'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create post_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(user_id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);

-- Create user_reports table for reporting users directly
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(user_id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reported_user_id, reporter_id)
);

-- Add is_suspended column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add suspended_at column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add suspended_reason column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'suspended_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspended_reason TEXT;
  END IF;
END $$;

-- Function to get all reports for admin (admin only)
CREATE OR REPLACE FUNCTION get_admin_reports(report_status TEXT DEFAULT 'pending')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin authorization
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT json_build_object(
    'post_reports', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', pr.id,
        'post_id', pr.post_id,
        'reason', pr.reason,
        'status', pr.status,
        'created_at', pr.created_at,
        'reporter', json_build_object(
          'user_id', reporter.user_id,
          'username', reporter.username,
          'display_name', reporter.display_name
        ),
        'post', json_build_object(
          'id', p.id,
          'content', p.content,
          'user_id', p.user_id,
          'author', json_build_object(
            'user_id', author.user_id,
            'username', author.username,
            'display_name', author.display_name
          )
        )
      ) ORDER BY pr.created_at DESC), '[]'::json)
      FROM post_reports pr
      LEFT JOIN profiles reporter ON pr.reporter_id = reporter.user_id
      LEFT JOIN posts p ON pr.post_id = p.id
      LEFT JOIN profiles author ON p.user_id = author.user_id
      WHERE pr.status = report_status OR report_status = 'all'
    ),
    'user_reports', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', ur.id,
        'reported_user_id', ur.reported_user_id,
        'reason', ur.reason,
        'status', ur.status,
        'created_at', ur.created_at,
        'reporter', json_build_object(
          'user_id', reporter.user_id,
          'username', reporter.username,
          'display_name', reporter.display_name
        ),
        'reported_user', json_build_object(
          'user_id', reported.user_id,
          'username', reported.username,
          'display_name', reported.display_name
        )
      ) ORDER BY ur.created_at DESC), '[]'::json)
      FROM user_reports ur
      LEFT JOIN profiles reporter ON ur.reporter_id = reporter.user_id
      LEFT JOIN profiles reported ON ur.reported_user_id = reported.user_id
      WHERE ur.status = report_status OR report_status = 'all'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to resolve a post report (admin only)
CREATE OR REPLACE FUNCTION resolve_post_report(
  report_id UUID,
  admin_id UUID,
  new_status TEXT,
  delete_post BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_id_to_delete UUID;
BEGIN
  -- Check admin authorization
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get post_id if we need to delete
  IF delete_post THEN
    SELECT post_id INTO post_id_to_delete FROM post_reports WHERE id = report_id;
  END IF;
  
  -- Update the report
  UPDATE post_reports 
  SET status = new_status,
      resolved_by = admin_id,
      resolved_at = NOW()
  WHERE id = report_id;
  
  -- Delete the post if requested
  IF delete_post AND post_id_to_delete IS NOT NULL THEN
    DELETE FROM posts WHERE id = post_id_to_delete;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to suspend a user (admin only)
CREATE OR REPLACE FUNCTION suspend_user(
  target_user_id UUID,
  admin_id UUID,
  reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin authorization
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE profiles 
  SET is_suspended = TRUE,
      suspended_at = NOW(),
      suspended_reason = reason
  WHERE user_id = target_user_id;
  
  -- Also resolve any pending reports against this user
  UPDATE user_reports 
  SET status = 'resolved',
      resolved_by = admin_id,
      resolved_at = NOW()
  WHERE reported_user_id = target_user_id AND status = 'pending';
  
  RETURN TRUE;
END;
$$;

-- Function to unsuspend a user (admin only)
CREATE OR REPLACE FUNCTION unsuspend_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin authorization
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE profiles 
  SET is_suspended = FALSE,
      suspended_at = NULL,
      suspended_reason = NULL
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to search users (admin only)
CREATE OR REPLACE FUNCTION admin_search_users(search_query TEXT, result_limit INT DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin authorization
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'user_id', p.user_id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'is_suspended', COALESCE(p.is_suspended, false),
    'suspended_reason', p.suspended_reason,
    'created_at', p.created_at,
    'post_count', (SELECT COUNT(*) FROM posts WHERE user_id = p.user_id),
    'follower_count', (SELECT COUNT(*) FROM follows WHERE following_id = p.user_id)
  ) ORDER BY p.created_at DESC), '[]'::json) INTO result
  FROM profiles p
  WHERE LOWER(p.username) LIKE LOWER('%' || search_query || '%')
     OR LOWER(p.display_name) LIKE LOWER('%' || search_query || '%');
  
  RETURN result;
END;
$$;

-- Indexes for reports tables
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_created ON post_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended) WHERE is_suspended = TRUE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_reports(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_post_report(UUID, UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_user(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unsuspend_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_search_users(TEXT, INT) TO authenticated;

-- Enable RLS on new tables
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Policies for post_reports
CREATE POLICY "Users can create reports" ON post_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can see their own reports" ON post_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- Policies for user_reports  
CREATE POLICY "Users can create user reports" ON user_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can see their own user reports" ON user_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);
