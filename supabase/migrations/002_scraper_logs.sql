-- supabase/migrations/002_scraper_logs.sql

CREATE TABLE IF NOT EXISTS scraper_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('success', 'error')),
  products_found INTEGER NOT NULL DEFAULT 0,
  error_message  TEXT,
  ran_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraper_logs_store_ran
  ON scraper_logs(store_id, ran_at DESC);

-- Lectura pública (el dashboard puede mostrar estado del scraper)
ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_scraper_logs"
  ON scraper_logs FOR SELECT USING (true);
