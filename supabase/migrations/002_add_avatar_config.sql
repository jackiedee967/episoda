-- Add avatar configuration columns to profiles table
-- These columns store the random color scheme and icon selection for auto-generated avatars
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_color_scheme INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS avatar_icon VARCHAR(50) DEFAULT 'icon-1-ellipse';

-- Add comments for documentation
COMMENT ON COLUMN profiles.avatar_color_scheme IS 'Color scheme ID (1-7) for auto-generated profile picture';
COMMENT ON COLUMN profiles.avatar_icon IS 'Icon name for auto-generated profile picture';

-- Note: Storage bucket and policies are already created in 001_initial_schema.sql
-- This migration only adds the new columns to existing profiles table
