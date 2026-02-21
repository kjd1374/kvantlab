-- Create keyword_trends table
CREATE TABLE IF NOT EXISTS keyword_trends (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    keyword TEXT NOT NULL,
    rank INT NOT NULL,
    source TEXT NOT NULL, -- 'naver_datalab', 'google_trends'
    category_code TEXT,   -- For Naver Data Lab (e.g., '50000002')
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_keyword_trends_date ON keyword_trends(date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_trends_source ON keyword_trends(source);
CREATE INDEX IF NOT EXISTS idx_keyword_trends_category ON keyword_trends(category_code);

-- Unique constraint to prevent duplicates (same keyword for same source/category on same day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_keyword_trends_unique 
ON keyword_trends(source, keyword, category_code, date);

-- RLS
ALTER TABLE keyword_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view keyword trends" ON keyword_trends FOR SELECT USING (true);
