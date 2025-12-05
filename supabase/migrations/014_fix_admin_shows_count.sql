-- Fix Admin Dashboard "Shows Logged" Count
-- The original function counted rows in the `shows` table (API cache)
-- This update counts unique shows that users have actually posted about
-- Run this in BOTH Dev and Prod Supabase SQL Editor

-- Update the get_admin_stats function
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
    -- Fixed: Count unique shows from posts, not the shows cache table
    'total_shows_logged', (SELECT COUNT(DISTINCT show_id) FROM posts WHERE show_id IS NOT NULL),
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
