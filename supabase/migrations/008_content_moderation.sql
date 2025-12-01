-- Content Moderation Migration
-- Adds flagging columns to posts and comments for automated moderation

-- Add moderation columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS flagged_for_moderation BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'removed'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_reviewed_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_reviewed_by UUID REFERENCES auth.users(id);

-- Add moderation columns to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS flagged_for_moderation BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'removed'));
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_reviewed_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_reviewed_by UUID REFERENCES auth.users(id);

-- Create index for efficient querying of flagged content
CREATE INDEX IF NOT EXISTS idx_posts_flagged ON posts(flagged_for_moderation, moderation_status) WHERE flagged_for_moderation = TRUE;
CREATE INDEX IF NOT EXISTS idx_comments_flagged ON comments(flagged_for_moderation, moderation_status) WHERE flagged_for_moderation = TRUE;

-- RPC function to get flagged content for admin review
CREATE OR REPLACE FUNCTION get_flagged_content()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is admin
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT json_build_object(
    'flagged_posts', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', p.id,
        'title', p.title,
        'body', p.body,
        'show_title', p.show_title,
        'moderation_reason', p.moderation_reason,
        'moderation_status', p.moderation_status,
        'created_at', p.created_at,
        'author', json_build_object(
          'user_id', pr.user_id,
          'username', pr.username,
          'display_name', pr.display_name
        )
      ) ORDER BY p.created_at DESC), '[]'::json)
      FROM posts p
      JOIN profiles pr ON p.user_id = pr.user_id
      WHERE p.flagged_for_moderation = TRUE
      AND p.moderation_status = 'pending'
    ),
    'flagged_comments', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', c.id,
        'comment_text', c.comment_text,
        'post_id', c.post_id,
        'moderation_reason', c.moderation_reason,
        'moderation_status', c.moderation_status,
        'created_at', c.created_at,
        'author', json_build_object(
          'user_id', pr.user_id,
          'username', pr.username,
          'display_name', pr.display_name
        )
      ) ORDER BY c.created_at DESC), '[]'::json)
      FROM comments c
      JOIN profiles pr ON c.user_id = pr.user_id
      WHERE c.flagged_for_moderation = TRUE
      AND c.moderation_status = 'pending'
    ),
    'counts', json_build_object(
      'pending_posts', (SELECT COUNT(*) FROM posts WHERE flagged_for_moderation = TRUE AND moderation_status = 'pending'),
      'pending_comments', (SELECT COUNT(*) FROM comments WHERE flagged_for_moderation = TRUE AND moderation_status = 'pending')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC function to review flagged post
CREATE OR REPLACE FUNCTION review_flagged_post(
  p_post_id UUID,
  p_action TEXT -- 'approve' or 'remove'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF p_action NOT IN ('approve', 'remove') THEN
    RAISE EXCEPTION 'Invalid action. Must be approve or remove';
  END IF;

  UPDATE posts
  SET 
    moderation_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'removed' END,
    flagged_for_moderation = CASE WHEN p_action = 'approve' THEN FALSE ELSE flagged_for_moderation END,
    moderation_reason = CASE WHEN p_action = 'approve' THEN NULL ELSE moderation_reason END,
    moderation_reviewed_at = NOW(),
    moderation_reviewed_by = auth.uid()
  WHERE id = p_post_id;

  RETURN TRUE;
END;
$$;

-- RPC function to review flagged comment
CREATE OR REPLACE FUNCTION review_flagged_comment(
  p_comment_id UUID,
  p_action TEXT -- 'approve' or 'remove'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF p_action NOT IN ('approve', 'remove') THEN
    RAISE EXCEPTION 'Invalid action. Must be approve or remove';
  END IF;

  UPDATE comments
  SET 
    moderation_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'removed' END,
    flagged_for_moderation = CASE WHEN p_action = 'approve' THEN FALSE ELSE flagged_for_moderation END,
    moderation_reason = CASE WHEN p_action = 'approve' THEN NULL ELSE moderation_reason END,
    moderation_reviewed_at = NOW(),
    moderation_reviewed_by = auth.uid()
  WHERE id = p_comment_id;

  RETURN TRUE;
END;
$$;
