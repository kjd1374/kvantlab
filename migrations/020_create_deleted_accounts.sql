-- Migration: Create deleted_accounts table for trial abuse prevention
-- Stores email and trial history when a user deletes their account

CREATE TABLE IF NOT EXISTS deleted_accounts (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    had_trial BOOLEAN DEFAULT false,
    subscription_tier TEXT DEFAULT 'free',
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    original_created_at TIMESTAMPTZ
);

-- Index for fast lookup during signup
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts (email);

-- Allow service role to insert/select
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on deleted_accounts"
    ON deleted_accounts
    FOR ALL
    USING (true)
    WITH CHECK (true);
