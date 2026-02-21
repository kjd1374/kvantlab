-- Crawl Logs Table
CREATE TABLE IF NOT EXISTS crawl_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_name      TEXT NOT NULL, -- e.g., 'daily_trend_crawl'
  status        TEXT NOT NULL, -- 'success', 'failed', 'running'
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  items_count   INT DEFAULT 0,
  error_message TEXT,
  metadata_json JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_started_at ON crawl_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_status ON crawl_logs(status);

-- RLS
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view logs" ON crawl_logs FOR SELECT USING (true);
