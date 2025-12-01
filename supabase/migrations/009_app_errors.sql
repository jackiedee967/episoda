-- Migration: App Error Logging and Admin Notification System
-- This migration creates the infrastructure for logging app errors and notifying admins

-- Create app_errors table for logging errors
CREATE TABLE IF NOT EXISTS app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  screen_name TEXT,
  stack_trace TEXT,
  component_stack TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_resolved ON app_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON app_errors(user_id);

-- Enable RLS
ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Any authenticated user can insert errors (their own crashes)
CREATE POLICY "Users can insert errors" ON app_errors
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view all errors
CREATE POLICY "Admins can view all errors" ON app_errors
  FOR SELECT
  USING (is_current_user_admin());

-- Policy: Only admins can update errors (mark as resolved, add notes)
CREATE POLICY "Admins can update errors" ON app_errors
  FOR UPDATE
  USING (is_current_user_admin());

-- RPC function to notify admins of errors via push notification
CREATE OR REPLACE FUNCTION notify_admins_of_error(
  p_error_message TEXT,
  p_screen_name TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record RECORD;
  v_username TEXT;
BEGIN
  -- Get the username of the user who encountered the error (if available)
  IF p_user_id IS NOT NULL THEN
    SELECT username INTO v_username FROM profiles WHERE id = p_user_id;
  END IF;

  -- Create notifications for all admins with push tokens
  FOR admin_record IN
    SELECT id, expo_push_token 
    FROM profiles 
    WHERE is_admin = TRUE 
    AND expo_push_token IS NOT NULL
  LOOP
    -- Insert notification record for each admin
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      data,
      created_at
    ) VALUES (
      admin_record.id,
      'admin_error_alert',
      'App Error Alert',
      COALESCE(v_username, 'A user') || ' encountered: ' || LEFT(p_error_message, 50),
      jsonb_build_object(
        'error_message', p_error_message,
        'screen_name', p_screen_name,
        'user_id', p_user_id
      ),
      NOW()
    );
  END LOOP;

  RETURN TRUE;
END;
$$;

-- RPC function to get error statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_error_stats()
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
    'total_errors', (SELECT COUNT(*) FROM app_errors),
    'unresolved_errors', (SELECT COUNT(*) FROM app_errors WHERE resolved = FALSE),
    'errors_today', (SELECT COUNT(*) FROM app_errors WHERE created_at >= CURRENT_DATE),
    'errors_this_week', (SELECT COUNT(*) FROM app_errors WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'top_screens', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT screen_name, COUNT(*) as count
        FROM app_errors
        WHERE screen_name IS NOT NULL
        GROUP BY screen_name
        ORDER BY count DESC
        LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC function to get recent errors for admin dashboard
CREATE OR REPLACE FUNCTION get_recent_errors(
  p_limit INT DEFAULT 50,
  p_include_resolved BOOLEAN DEFAULT FALSE
)
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

  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT 
      e.id,
      e.error_message,
      e.screen_name,
      e.platform,
      e.resolved,
      e.notes,
      e.created_at,
      p.username as user_username,
      p.display_name as user_display_name
    FROM app_errors e
    LEFT JOIN profiles p ON e.user_id = p.id
    WHERE (p_include_resolved OR e.resolved = FALSE)
    ORDER BY e.created_at DESC
    LIMIT p_limit
  ) t INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- RPC function to resolve an error
CREATE OR REPLACE FUNCTION resolve_error(
  p_error_id UUID,
  p_notes TEXT DEFAULT NULL
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

  UPDATE app_errors
  SET 
    resolved = TRUE,
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_error_id;

  RETURN TRUE;
END;
$$;
