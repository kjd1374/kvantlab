-- Add AI Summary column to products_master
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ai_summary JSONB DEFAULT NULL;

COMMENT ON COLUMN products_master.ai_summary IS 'Google Gemini AI generated product review analysis';

-- No need for a trigger yet as we can call the edge function from the crawler or via webhook configuration in Supabase Dashboard.
