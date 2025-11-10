-- Add avatar configuration columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_color_scheme INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS avatar_icon VARCHAR(50) DEFAULT 'icon-1-ellipse';

-- Add comments for documentation
COMMENT ON COLUMN profiles.avatar_color_scheme IS 'Color scheme ID (1-7) for auto-generated profile picture';
COMMENT ON COLUMN profiles.avatar_icon IS 'Icon name for auto-generated profile picture';

-- Create storage bucket for profile pictures (for future use)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for profile pictures bucket
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
