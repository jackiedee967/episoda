-- Add favorite_shows column to profiles table if it doesn't exist
-- This column stores user's favorite shows as a JSONB array

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

-- Create an RPC function to get user favorites (bypasses PostgREST cache)
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

-- Create an RPC function to update user favorites (bypasses PostgREST cache)
CREATE OR REPLACE FUNCTION update_user_favorites(p_user_id UUID, p_favorites JSONB)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_favorites(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_favorites(UUID, JSONB) TO authenticated;
