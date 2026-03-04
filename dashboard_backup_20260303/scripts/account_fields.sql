-- ==========================================
-- Add Account Management Fields to Profiles
-- ==========================================

-- 1. Add phone number
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Add shipping address
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. Add soft delete timestamp (for account cancellation)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
