-- ============================================================
-- Product Search Requests table
-- For users to submit image/SNS link based product search requests
-- Run this once in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS product_search_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  user_email TEXT,
  sns_link TEXT,
  image_urls TEXT[],
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','found','not_found')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE product_search_requests ENABLE ROW LEVEL SECURITY;

-- Users can see and insert their own requests
DROP POLICY IF EXISTS "Users manage own search requests" ON product_search_requests;
CREATE POLICY "Users manage own search requests" ON product_search_requests
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (admin server) can do everything
-- (the server uses the service_role key so it bypasses RLS automatically)

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_search_requests_user_id ON product_search_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_search_requests_status ON product_search_requests(status);
CREATE INDEX IF NOT EXISTS idx_search_requests_created ON product_search_requests(created_at DESC);

-- ============================================================
-- ALSO: Create Storage bucket in Supabase Dashboard manually:
--   Name: search-request-images
--   Public: true (so image URLs are accessible)
--   File size limit: 5MB per file
-- ============================================================
