-- supabase/migrations/001_initial_schema.sql

-- Productos monitoreados
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store       TEXT NOT NULL,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL UNIQUE,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historial de precios (un registro por scraping)
CREATE TABLE IF NOT EXISTS price_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price       NUMERIC(12, 2) NOT NULL,
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_product_scraped
  ON price_snapshots(product_id, scraped_at DESC);

-- Alertas de error de precio detectadas
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_price   NUMERIC(12, 2) NOT NULL,
  historical_avg  NUMERIC(12, 2) NOT NULL,
  discount_pct    NUMERIC(5, 2) NOT NULL,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_alerts_active_detected
  ON alerts(is_active, detected_at DESC);

-- RLS: lectura pública (el frontend usa anon key)
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_products"
  ON products FOR SELECT USING (true);

CREATE POLICY "public_read_alerts"
  ON alerts FOR SELECT USING (true);

-- Realtime para el dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
