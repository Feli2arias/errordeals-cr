-- Agrega precio original (tachado) a los snapshots para detectar descuentos reales de tiendas
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS original_price DECIMAL(12, 2);

-- Vista de descuentos actuales >= 50% (último snapshot por producto)
CREATE OR REPLACE VIEW discount_products AS
SELECT DISTINCT ON (ps.product_id)
  ps.product_id,
  ps.price        AS current_price,
  ps.original_price,
  ROUND(((ps.original_price - ps.price) / ps.original_price * 100)::numeric) AS discount_pct,
  ps.scraped_at,
  p.name,
  p.url,
  p.store,
  p.image_url
FROM price_snapshots ps
JOIN products p ON p.id = ps.product_id
WHERE ps.original_price IS NOT NULL
  AND ps.original_price > 0
  AND (ps.original_price - ps.price) / ps.original_price >= 0.5
ORDER BY ps.product_id, ps.scraped_at DESC;

GRANT SELECT ON discount_products TO anon, authenticated;
