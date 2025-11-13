-- Create shows table
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trakt_id INTEGER NOT NULL UNIQUE,
  imdb_id VARCHAR(20),
  tvdb_id INTEGER,
  tmdb_id INTEGER,
  tvmaze_id INTEGER,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  poster_url TEXT,
  rating DECIMAL(3,1),
  total_seasons INTEGER,
  total_episodes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on trakt_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_shows_trakt_id ON public.shows(trakt_id);
CREATE INDEX IF NOT EXISTS idx_shows_imdb_id ON public.shows(imdb_id);

-- Create episodes table
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  trakt_id INTEGER,
  imdb_id VARCHAR(20),
  tvdb_id INTEGER,
  tmdb_id INTEGER,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  rating DECIMAL(3,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(show_id, season_number, episode_number)
);

-- Create indexes on episodes for faster lookups
CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON public.episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_episodes_trakt_id ON public.episodes(trakt_id);
CREATE INDEX IF NOT EXISTS idx_episodes_lookup ON public.episodes(show_id, season_number, episode_number);

-- Add CHECK constraints for data integrity
ALTER TABLE public.shows ADD CONSTRAINT check_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));
ALTER TABLE public.shows ADD CONSTRAINT check_total_seasons CHECK (total_seasons IS NULL OR total_seasons >= 0);
ALTER TABLE public.shows ADD CONSTRAINT check_total_episodes CHECK (total_episodes IS NULL OR total_episodes >= 0);

ALTER TABLE public.episodes ADD CONSTRAINT check_episode_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));
ALTER TABLE public.episodes ADD CONSTRAINT check_season_number CHECK (season_number >= 0);
ALTER TABLE public.episodes ADD CONSTRAINT check_episode_number CHECK (episode_number >= 1);

-- Enable Row Level Security
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users only (no anonymous access)
CREATE POLICY "Authenticated users can read shows" ON public.shows
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read episodes" ON public.episodes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert shows (for saving from search)
CREATE POLICY "Authenticated users can insert shows" ON public.shows
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert episodes" ON public.episodes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only service role can update (prevents users from modifying global metadata)
-- Updates should happen via backend API routes or admin functions only

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON public.shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
