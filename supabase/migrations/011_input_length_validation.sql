-- Migration: Input Length Validation
-- Adds server-side length constraints to prevent abuse

-- Posts table constraints
ALTER TABLE posts 
  ADD CONSTRAINT posts_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT posts_body_length CHECK (char_length(body) <= 5000);

-- Comments table constraint
ALTER TABLE comments 
  ADD CONSTRAINT comments_text_length CHECK (char_length(comment_text) <= 2000);

-- Profiles table constraints
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_username_length CHECK (char_length(username) BETWEEN 3 AND 50),
  ADD CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) <= 100),
  ADD CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 500);

-- Playlists table constraints
ALTER TABLE playlists
  ADD CONSTRAINT playlists_name_length CHECK (char_length(name) BETWEEN 1 AND 100);

-- Reports constraints
ALTER TABLE post_reports
  ADD CONSTRAINT post_reports_reason_length CHECK (char_length(reason) <= 1000);

ALTER TABLE user_reports
  ADD CONSTRAINT user_reports_reason_length CHECK (char_length(reason) <= 1000);

-- Help desk constraints
ALTER TABLE help_desk_posts
  ADD CONSTRAINT help_desk_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT help_desk_details_length CHECK (char_length(details) <= 5000);

ALTER TABLE help_desk_comments
  ADD CONSTRAINT help_desk_comments_length CHECK (char_length(comment_text) <= 2000);
