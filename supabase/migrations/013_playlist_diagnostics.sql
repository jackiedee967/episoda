-- Migration: Playlist diagnostics and repair functions
-- Purpose: Capture and fix legacy show_id formats in playlist_shows table

-- Create diagnostics table to capture legacy IDs from production
CREATE TABLE IF NOT EXISTS playlist_id_diagnostics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    playlist_id uuid,
    playlist_name text,
    show_id text NOT NULL,
    id_format text,
    resolved_uuid uuid,
    resolution_status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_playlist_diagnostics_user ON playlist_id_diagnostics(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_diagnostics_status ON playlist_id_diagnostics(resolution_status);

-- RPC function to diagnose playlist_shows entries for a user
CREATE OR REPLACE FUNCTION diagnose_playlist_shows(p_user_id uuid)
RETURNS TABLE (
    playlist_id uuid,
    playlist_name text,
    show_id text,
    id_format text,
    show_exists boolean,
    show_title text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.playlist_id,
        p.name as playlist_name,
        ps.show_id,
        CASE 
            WHEN ps.show_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'valid_uuid'
            WHEN ps.show_id ~ '^[0-9a-f]{32}$' THEN 'uuid_no_hyphens'
            WHEN ps.show_id ~ '^trakt[-_]' THEN 'trakt_prefix'
            WHEN ps.show_id ~ '^tmdb[-_]' THEN 'tmdb_prefix'
            WHEN ps.show_id ~ '^tvdb[-_]' THEN 'tvdb_prefix'
            WHEN ps.show_id ~ '^tvmaze[-_]' THEN 'tvmaze_prefix'
            WHEN ps.show_id ~ '^imdb[-_]' THEN 'imdb_prefix'
            WHEN ps.show_id ~ '^tt\d+' THEN 'imdb_direct'
            WHEN ps.show_id ~ '^\d+$' THEN 'numeric_only'
            ELSE 'unknown'
        END as id_format,
        EXISTS(SELECT 1 FROM shows s WHERE s.id::text = ps.show_id) as show_exists,
        (SELECT s.title FROM shows s WHERE s.id::text = ps.show_id LIMIT 1) as show_title
    FROM playlist_shows ps
    JOIN playlists p ON ps.playlist_id = p.id
    WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to repair playlist_shows by resolving legacy IDs to UUIDs
CREATE OR REPLACE FUNCTION repair_playlist_shows(p_user_id uuid)
RETURNS TABLE (
    playlist_name text,
    old_show_id text,
    new_show_id uuid,
    resolution_method text,
    success boolean
) AS $$
DECLARE
    rec RECORD;
    resolved_id uuid;
    trakt_id_num integer;
    tmdb_id_num integer;
    tvdb_id_num integer;
    tvmaze_id_num integer;
    imdb_id_val text;
BEGIN
    FOR rec IN 
        SELECT 
            ps.playlist_id,
            ps.show_id,
            p.name as playlist_name
        FROM playlist_shows ps
        JOIN playlists p ON ps.playlist_id = p.id
        WHERE p.user_id = p_user_id
        AND ps.show_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        resolved_id := NULL;
        
        -- Try to resolve based on format
        IF rec.show_id ~ '^[0-9a-f]{32}$' THEN
            -- UUID without hyphens - add hyphens
            resolved_id := (
                substring(rec.show_id, 1, 8) || '-' ||
                substring(rec.show_id, 9, 4) || '-' ||
                substring(rec.show_id, 13, 4) || '-' ||
                substring(rec.show_id, 17, 4) || '-' ||
                substring(rec.show_id, 21)
            )::uuid;
            
            IF EXISTS(SELECT 1 FROM shows WHERE id = resolved_id) THEN
                UPDATE playlist_shows SET show_id = resolved_id::text 
                WHERE playlist_id = rec.playlist_id AND show_id = rec.show_id;
                
                RETURN QUERY SELECT rec.playlist_name, rec.show_id, resolved_id, 'uuid_normalized', true;
                CONTINUE;
            END IF;
        END IF;
        
        -- Try trakt prefix
        IF rec.show_id ~ '^trakt[-_](\d+)' THEN
            trakt_id_num := (regexp_matches(rec.show_id, '^trakt[-_](\d+)'))[1]::integer;
            SELECT id INTO resolved_id FROM shows WHERE trakt_id = trakt_id_num LIMIT 1;
            
            IF resolved_id IS NOT NULL THEN
                UPDATE playlist_shows SET show_id = resolved_id::text 
                WHERE playlist_id = rec.playlist_id AND show_id = rec.show_id;
                
                RETURN QUERY SELECT rec.playlist_name, rec.show_id, resolved_id, 'trakt_lookup', true;
                CONTINUE;
            END IF;
        END IF;
        
        -- Try tmdb prefix
        IF rec.show_id ~ '^tmdb[-_](\d+)' THEN
            tmdb_id_num := (regexp_matches(rec.show_id, '^tmdb[-_](\d+)'))[1]::integer;
            SELECT id INTO resolved_id FROM shows WHERE tmdb_id = tmdb_id_num LIMIT 1;
            
            IF resolved_id IS NOT NULL THEN
                UPDATE playlist_shows SET show_id = resolved_id::text 
                WHERE playlist_id = rec.playlist_id AND show_id = rec.show_id;
                
                RETURN QUERY SELECT rec.playlist_name, rec.show_id, resolved_id, 'tmdb_lookup', true;
                CONTINUE;
            END IF;
        END IF;
        
        -- Try tvdb prefix
        IF rec.show_id ~ '^tvdb[-_](\d+)' THEN
            tvdb_id_num := (regexp_matches(rec.show_id, '^tvdb[-_](\d+)'))[1]::integer;
            SELECT id INTO resolved_id FROM shows WHERE tvdb_id = tvdb_id_num LIMIT 1;
            
            IF resolved_id IS NOT NULL THEN
                UPDATE playlist_shows SET show_id = resolved_id::text 
                WHERE playlist_id = rec.playlist_id AND show_id = rec.show_id;
                
                RETURN QUERY SELECT rec.playlist_name, rec.show_id, resolved_id, 'tvdb_lookup', true;
                CONTINUE;
            END IF;
        END IF;
        
        -- Try tvmaze prefix
        IF rec.show_id ~ '^tvmaze[-_](\d+)' THEN
            tvmaze_id_num := (regexp_matches(rec.show_id, '^tvmaze[-_](\d+)'))[1]::integer;
            SELECT id INTO resolved_id FROM shows WHERE tvmaze_id = tvmaze_id_num LIMIT 1;
            
            IF resolved_id IS NOT NULL THEN
                UPDATE playlist_shows SET show_id = resolved_id::text 
                WHERE playlist_id = rec.playlist_id AND show_id = rec.show_id;
                
                RETURN QUERY SELECT rec.playlist_name, rec.show_id, resolved_id, 'tvmaze_lookup', true;
                CONTINUE;
            END IF;
        END IF;
        
        -- Try imdb prefix or direct tt format
        IF rec.show_id ~ '(tt\d+)' THEN
            imdb_id_val := (regexp_matches(rec.show_id, '(tt\d+)'))[1];
            SELECT id INTO resolved_id FROM shows WHERE imdb_id = imdb_id_val LIMIT 1;
            
            IF resolved_id IS NOT NULL THEN
                UPDATE playlist_shows SET show_id = resolved_id::text 
                WHERE playlist_id = rec.playlist_id AND show_id = rec.show_id;
                
                RETURN QUERY SELECT rec.playlist_name, rec.show_id, resolved_id, 'imdb_lookup', true;
                CONTINUE;
            END IF;
        END IF;
        
        -- Try plain numeric (assume trakt_id)
        IF rec.show_id ~ '^\d+$' THEN
            trakt_id_num := rec.show_id::integer;
            SELECT id INTO resolved_id FROM shows WHERE trakt_id = trakt_id_num LIMIT 1;
            
            IF resolved_id IS NOT NULL THEN
                UPDATE playlist_shows SET show_id = resolved_id::text 
                WHERE playlist_id = rec.playlist_id AND show_id = rec.show_id;
                
                RETURN QUERY SELECT rec.playlist_name, rec.show_id, resolved_id, 'numeric_trakt_lookup', true;
                CONTINUE;
            END IF;
        END IF;
        
        -- Could not resolve
        RETURN QUERY SELECT rec.playlist_name, rec.show_id, NULL::uuid, 'unresolved', false;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to log diagnostic data from client
CREATE OR REPLACE FUNCTION log_playlist_diagnostic(
    p_user_id uuid,
    p_playlist_id uuid,
    p_playlist_name text,
    p_show_id text,
    p_id_format text,
    p_resolved_uuid uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO playlist_id_diagnostics (user_id, playlist_id, playlist_name, show_id, id_format, resolved_uuid, resolution_status)
    VALUES (p_user_id, p_playlist_id, p_playlist_name, p_show_id, p_id_format, p_resolved_uuid, 
            CASE WHEN p_resolved_uuid IS NOT NULL THEN 'resolved' ELSE 'pending' END)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION diagnose_playlist_shows(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION repair_playlist_shows(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_playlist_diagnostic(uuid, uuid, text, text, text, uuid) TO authenticated;
