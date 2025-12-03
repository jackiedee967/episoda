-- PRODUCTION MIGRATION: Fixes for Favorites and Date Ranges
-- Run this SQL in your Supabase PRODUCTION dashboard (EPISODA-Prod)

-- ============================================================
-- PART 1: Add favorite_shows column to profiles
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'favorite_shows'
    ) THEN
        ALTER TABLE profiles ADD COLUMN favorite_shows JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- ============================================================
-- PART 2: Create get_user_favorites RPC function
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_favorites(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(favorite_shows, '[]'::jsonb)
    INTO result
    FROM profiles
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- PART 3: Create set_user_favorites RPC function
-- (This is the function name the app code expects)
-- ============================================================

CREATE OR REPLACE FUNCTION set_user_favorites(p_user_id UUID, p_favorites JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET favorite_shows = p_favorites
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- ============================================================
-- PART 4: Add end_year column to shows table
-- (Required for date range display in Currently Watching)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shows' 
        AND column_name = 'end_year'
    ) THEN
        ALTER TABLE shows ADD COLUMN end_year INTEGER;
    END IF;
END $$;

-- ============================================================
-- PART 5: Grant permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION get_user_favorites(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_favorites(UUID, JSONB) TO authenticated;
