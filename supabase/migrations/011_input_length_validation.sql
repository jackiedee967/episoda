-- Migration: Input Length Validation
-- Adds server-side length constraints to prevent abuse
-- Uses DO blocks to make constraints idempotent (won't fail if already exists or table missing)

-- Posts table constraints
DO $$ BEGIN
  ALTER TABLE posts ADD CONSTRAINT posts_title_length CHECK (char_length(title) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE posts ADD CONSTRAINT posts_body_length CHECK (char_length(body) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Comments table constraint
DO $$ BEGIN
  ALTER TABLE comments ADD CONSTRAINT comments_text_length CHECK (char_length(comment_text) <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles table constraints
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_username_length CHECK (char_length(username) BETWEEN 3 AND 50);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Playlists table constraints
DO $$ BEGIN
  ALTER TABLE playlists ADD CONSTRAINT playlists_name_length CHECK (char_length(name) BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reports constraints (only if tables exist - they are created in migration 007)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_reports') THEN
    ALTER TABLE post_reports ADD CONSTRAINT post_reports_reason_length CHECK (char_length(reason) <= 1000);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_reports') THEN
    ALTER TABLE user_reports ADD CONSTRAINT user_reports_reason_length CHECK (char_length(reason) <= 1000);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Help desk constraints (only if tables exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_desk_posts') THEN
    ALTER TABLE help_desk_posts ADD CONSTRAINT help_desk_title_length CHECK (char_length(title) <= 200);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_desk_posts') THEN
    ALTER TABLE help_desk_posts ADD CONSTRAINT help_desk_details_length CHECK (char_length(details) <= 5000);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_desk_comments') THEN
    ALTER TABLE help_desk_comments ADD CONSTRAINT help_desk_comments_length CHECK (char_length(comment_text) <= 2000);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
