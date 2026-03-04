-- ==========================================
-- Setup 14-Day Free Pro Trial for New Signups
-- ==========================================
-- This script updates the trigger function that runs when a new user signs up.
-- It automatically assigns them the 'pro' tier for 14 days.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, company, subscription_tier, subscription_expires_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'company',
    'pro',                            -- Default to 'pro' tier
    now() + interval '14 days'        -- 14 days trial period
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Optional) If you want to update existing 'free' users to have a 14-day trial from today:
-- UPDATE public.profiles 
-- SET subscription_tier = 'pro', subscription_expires_at = now() + interval '14 days' 
-- WHERE subscription_tier = 'free' OR subscription_tier IS NULL;
