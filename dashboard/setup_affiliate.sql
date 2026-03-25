-- ==========================================
-- K-Vant Affiliate Partner System - DB Schema
-- ==========================================

-- 1. Partner accounts
CREATE TABLE IF NOT EXISTS affiliate_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  ref_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Referral mapping (which user signed up via which partner)
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id BIGSERIAL PRIMARY KEY,
  partner_id UUID REFERENCES affiliate_partners(id) ON DELETE CASCADE,
  referred_user_id UUID,
  ref_code TEXT NOT NULL,
  status TEXT DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'trial', 'paid', 'churned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Summary stats (dashboard reads ONLY this table — no heavy COUNT/SUM queries)
CREATE TABLE IF NOT EXISTS partner_stats (
  partner_id UUID PRIMARY KEY REFERENCES affiliate_partners(id) ON DELETE CASCADE,
  total_signups INT DEFAULT 0,
  active_trials INT DEFAULT 0,
  paid_conversions INT DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  available_payout DECIMAL(10,2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payout history
CREATE TABLE IF NOT EXISTS partner_payouts (
  id BIGSERIAL PRIMARY KEY,
  partner_id UUID REFERENCES affiliate_partners(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_ref_code ON affiliate_referrals(ref_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_ref_code ON affiliate_partners(ref_code);
