-- Migration: Split single address into structured address fields
-- Execute this script in your Supabase SQL Editor

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS address1 TEXT,
ADD COLUMN IF NOT EXISTS address2 TEXT;

-- (Optional) If you want to migrate existing data in the 'address' column to 'address1'
-- UPDATE public.user_profiles SET address1 = address WHERE address IS NOT NULL AND address1 IS NULL;

-- (Optional) You can then drop the original address column if no longer needed
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS address;
