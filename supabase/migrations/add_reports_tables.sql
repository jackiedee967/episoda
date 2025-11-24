-- Create reports table for user reports
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporter_id VARCHAR(255) REFERENCES profiles(user_id) ON DELETE CASCADE,
  reported_user_id VARCHAR(255) REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'impersonation', 'other'
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post_reports table for post reports
CREATE TABLE IF NOT EXISTS post_reports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporter_id VARCHAR(255) REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id VARCHAR(255) REFERENCES posts(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'impersonation', 'other'
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_id ON post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON post_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports (user reports)
-- Reporters can view their own reports
CREATE POLICY "Users can view their own reports" 
  ON reports FOR SELECT 
  USING (auth.uid() = reporter_id);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports" 
  ON reports FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);

-- RLS Policies for post_reports
-- Reporters can view their own post reports
CREATE POLICY "Users can view their own post reports" 
  ON post_reports FOR SELECT 
  USING (auth.uid() = reporter_id);

-- Authenticated users can create post reports
CREATE POLICY "Authenticated users can create post reports" 
  ON post_reports FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_reports_updated_at
  BEFORE UPDATE ON post_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
