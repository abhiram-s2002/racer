-- Create reports table for reporting inappropriate content
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  seller_username TEXT,
  reason TEXT NOT NULL DEFAULT 'inappropriate_content',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status = 'confirmed'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hidden_listings table for hiding listings from user's feed
CREATE TABLE IF NOT EXISTS hidden_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Create hidden_requests table for hiding requests from user's feed
CREATE TABLE IF NOT EXISTS hidden_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, request_id)
);

-- Create blocked_users table for blocking users
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_listing_id ON reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_request_id ON reports(request_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_hidden_listings_user_id ON hidden_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_listings_listing_id ON hidden_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_hidden_requests_user_id ON hidden_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_requests_request_id ON hidden_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports table
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- RLS Policies for hidden_listings table
CREATE POLICY "Users can hide listings" ON hidden_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their hidden listings" ON hidden_listings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their hidden listings" ON hidden_listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unhide listings" ON hidden_listings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for hidden_requests table
CREATE POLICY "Users can hide requests" ON hidden_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their hidden requests" ON hidden_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their hidden requests" ON hidden_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unhide requests" ON hidden_requests
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for blocked_users table
CREATE POLICY "Users can block other users" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can update their blocked users" ON blocked_users
  FOR UPDATE USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocked users" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock users" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_user_id UUID, blocked_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = blocker_user_id 
    AND blocked_id = blocked_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get hidden listing IDs for a user
CREATE OR REPLACE FUNCTION get_hidden_listing_ids(user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT listing_id FROM hidden_listings 
    WHERE hidden_listings.user_id = get_hidden_listing_ids.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get blocked user IDs for a user
CREATE OR REPLACE FUNCTION get_blocked_user_ids(user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT blocked_id FROM blocked_users 
    WHERE blocker_id = get_blocked_user_ids.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get hidden request IDs for a user
CREATE OR REPLACE FUNCTION get_hidden_request_ids(user_id UUID)
RETURNS TABLE(request_id UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT hr.request_id
  FROM hidden_requests hr
  WHERE hr.user_id = get_hidden_request_ids.user_id;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON reports TO authenticated;
GRANT ALL ON hidden_listings TO authenticated;
GRANT ALL ON hidden_requests TO authenticated;
GRANT ALL ON blocked_users TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hidden_listing_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hidden_request_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_user_ids(UUID) TO authenticated;
