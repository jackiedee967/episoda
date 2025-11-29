-- Add missing is_rewatch column to watch_history
-- This column tracks whether an episode was rewatched (vs first watch)

ALTER TABLE watch_history 
ADD COLUMN IF NOT EXISTS is_rewatch BOOLEAN DEFAULT false;

-- Add the performance index for rewatch queries
CREATE INDEX IF NOT EXISTS idx_watch_history_user_rewatch 
  ON watch_history(user_id, is_rewatch, watched_at DESC);
