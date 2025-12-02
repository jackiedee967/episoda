-- Migration: Rate Limiting Infrastructure
-- Creates table and functions for rate limiting various actions

-- Rate limits table to track action counts per user/identifier
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action_type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
  ON rate_limits(identifier, action_type, window_start);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
  ON rate_limits(window_start);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from authenticated users and service role
CREATE POLICY "Allow rate limit inserts" ON rate_limits
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow reads for rate limit checks
CREATE POLICY "Allow rate limit reads" ON rate_limits
  FOR SELECT
  USING (true);

-- Policy: Allow updates for incrementing counts
CREATE POLICY "Allow rate limit updates" ON rate_limits
  FOR UPDATE
  USING (true);

-- Function to check and increment rate limit
-- Returns TRUE if action is allowed, FALSE if rate limited
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_count INTEGER,
  p_window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_existing_id UUID;
BEGIN
  -- Calculate the start of the current time window
  v_window_start := date_trunc('minute', NOW()) - 
    ((EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes) * INTERVAL '1 minute');
  
  -- Check for existing record in this window
  SELECT id, count INTO v_existing_id, v_current_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start = v_window_start
  FOR UPDATE;
  
  IF v_existing_id IS NOT NULL THEN
    -- Record exists, check if we're over the limit
    IF v_current_count >= p_max_count THEN
      RETURN FALSE; -- Rate limited
    END IF;
    
    -- Increment the count
    UPDATE rate_limits
    SET count = count + 1
    WHERE id = v_existing_id;
  ELSE
    -- No record exists, create one
    INSERT INTO rate_limits (identifier, action_type, count, window_start)
    VALUES (p_identifier, p_action_type, 1, v_window_start);
  END IF;
  
  RETURN TRUE; -- Action allowed
END;
$$;

-- Function to get remaining rate limit count
CREATE OR REPLACE FUNCTION get_rate_limit_remaining(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_count INTEGER,
  p_window_minutes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start := date_trunc('minute', NOW()) - 
    ((EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes) * INTERVAL '1 minute');
  
  SELECT COALESCE(count, 0) INTO v_current_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start = v_window_start;
  
  RETURN GREATEST(p_max_count - COALESCE(v_current_count, 0), 0);
END;
$$;

-- Cleanup function to remove old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_rate_limit_remaining(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rate_limit_remaining(TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO authenticated;

-- Rate limit constants as comments for reference:
-- OTP: 3 per phone per 60 minutes (action_type: 'otp')
-- Posts: 20 per user per 60 minutes (action_type: 'post')
-- Comments: 60 per user per 60 minutes (action_type: 'comment')
-- Follows: 100 per user per 60 minutes (action_type: 'follow')
-- Reports: 10 per user per 1440 minutes/24hr (action_type: 'report')
