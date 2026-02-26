-- B2B Sourcing Requests Table Setup
-- Run this in the Supabase SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.sourcing_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_message TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, quoted, canceled, completed
    estimated_cost NUMERIC(10, 2),
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add comments
COMMENT ON TABLE public.sourcing_requests IS 'B2B Sourcing quote requests from users';
COMMENT ON COLUMN public.sourcing_requests.items IS 'JSON array of requested items (name, brand, volume, quantity, etc.)';
COMMENT ON COLUMN public.sourcing_requests.status IS 'Status of the request (pending, quoted, canceled)';

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.sourcing_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Users can only view their own requests
CREATE POLICY "Users can view own sourcing requests"
    ON public.sourcing_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert own sourcing requests"
    ON public.sourcing_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Only admins (or service role) can update all requests (admin panel)
-- Users cannot update their own request once submitted via API (handled via backend Service Role)

-- 5. Trigger to update the `updated_at` column automatically
CREATE OR REPLACE FUNCTION update_sourcing_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sourcing_requests_updated_at ON public.sourcing_requests;

CREATE TRIGGER trg_sourcing_requests_updated_at
BEFORE UPDATE ON public.sourcing_requests
FOR EACH ROW
EXECUTE FUNCTION update_sourcing_updated_at_column();
