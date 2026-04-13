# ErrorDeals CR – Plan C: Infraestructura (GitHub Actions + Monitoreo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar el scheduler en GitHub Actions que corre el scraper cada 10 minutos sin intervención manual, con logs accesibles y alertas automáticas cuando el scraper falla repetidamente.

**Architecture:** Un workflow YAML en GitHub Actions corre `python scraper/main.py` cada 10 minutos. Los secrets de Supabase se almacenan en GitHub Secrets. El monitoreo de fallos usa un contador en Supabase — si una tienda falla 3 veces consecutivas, se inserta un registro en una tabla `scraper_errors` que el dashboard puede mostrar (o enviar alerta por email en Fase 2).

**Tech Stack:** GitHub Actions, Python 3.11, Playwright, Supabase (tabla scraper_logs)

---

## File Structure

```
pricerrors/
├── .github/
│   └── workflows/
│       └── scraper.yml            # Workflow principal (cada 10 min)
├── supabase/
│   └── migrations/
│       └── 002_scraper_logs.sql   # Tabla de logs del scraper
└── scraper/
    └── logger.py                  # Guarda logs de scraping en Supabase
```

---

### Task 1: Tabla scraper_logs en Supabase

**Files:**
- Create: `supabase/migrations/002_scraper_logs.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/002_scraper_logs.sql

CREATE TABLE IF NOT EXISTS scraper_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('success', 'error')),
  products_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  ran_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraper_logs_store_ran
  ON scraper_logs(store_id, ran_at DESC);

-- Lectura pública (el dashboard puede mostrar estado del scraper)
ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_scraper_logs"
  ON scraper_logs FOR SELECT USING (true);
```

- [ ] **Step 2: Aplicar en Supabase**

En el SQL Editor de Supabase, ejecutar el contenido de `002_scraper_logs.sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_scraper_logs.sql
git commit -m "feat: tabla scraper_logs para monitoreo de runs"
```

---

### Task 2: Logger de scraping

**Files:**
- Create: `scraper/logger.py`
- Modify: `scraper/main.py`

- [ ] **Step 1: Implementar logger.py**

```python
# scraper/logger.py
"""Guarda resultados de cada run del scraper en Supabase para monitoreo."""
from db import get_client

def log_run(store_id: str, status: str, products_found: int = 0, error_message: str = None) -> None:
    """
    Registra el resultado de un run de scraping.

    Args:
        store_id: Identificador de la tienda ('walmart', 'gollo', 'monge')
        status: 'success' o 'error'
        products_found: Cantidad de productos encontrados (0 en caso de error)
        error_message: Mensaje de error si status == 'error'
    """
    client = get_client()
    client.table("scraper_logs").insert({
        "store_id": store_id,
        "status": status,
        "products_found": products_found,
        "error_message": error_message,
    }).execute()

def get_consecutive_failures(store_id: str) -> int:
    """Retorna cuántos runs consecutivos fallaron para una tienda."""
    client = get_client()
    result = (
        client.table("scraper_logs")
        .select("status")
        .eq("store_id", store_id)
        .order("ran_at", desc=True)
        .limit(10)
        .execute()
    )
    count = 0
    for row in result.data:
        if row["status"] == "error":
            count += 1
        else:
            break
    return count
```

- [ ] **Step 2: Integrar logger en main.py**

Reemplazar la función `process_store` en `scraper/main.py` por esta versión con logging:

```python
# En scraper/main.py — reemplazar process_store()
from logger import log_run, get_consecutive_failures

async def process_store(adapter) -> None:
    logger.info(f"Scrapeando {adapter.store_id}...")
    try:
        products = await scrape_adapter(adapter)

        if not products:
            logger.warning(f"[{adapter.store_id}] No se encontraron productos")
            log_run(adapter.store_id, "error", 0, "No se encontraron productos")
            return

        client = get_client()
        settings = get_settings()
        history_days = settings["detection"]["history_days"]

        for product in products:
            try:
                product_id = upsert_product(client, product)
                save_snapshot(client, product_id, product.price)

                snapshots = get_recent_snapshots(client, product_id, history_days)
                historical = snapshots[1:] if len(snapshots) > 1 else []

                if detect_anomaly(product.price, historical):
                    logger.info(f"ALERTA detectada: {product.name} @ ₡{product.price:,.0f}")
                    avg = sum(historical) / len(historical)
                    publish_alert(product_id, product.price, avg)
                else:
                    resolve_alert(product_id)

            except Exception as e:
                logger.error(f"Error procesando {product.url}: {e}")

        log_run(adapter.store_id, "success", len(products))

    except Exception as e:
        logger.error(f"[{adapter.store_id}] Scraping fallido: {e}")
        log_run(adapter.store_id, "error", 0, str(e))

        failures = get_consecutive_failures(adapter.store_id)
        if failures >= 3:
            logger.critical(
                f"[{adapter.store_id}] ALERTA: {failures} fallos consecutivos. "
                f"Revisar si la tienda cambió su HTML o está bloqueando el scraper."
            )
```

- [ ] **Step 3: Commit**

```bash
git add scraper/logger.py scraper/main.py
git commit -m "feat: logging de runs en Supabase + alerta por fallos consecutivos"
```

---

### Task 3: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/scraper.yml`

- [ ] **Step 1: Crear workflow YAML**

```yaml
# .github/workflows/scraper.yml
name: Scraper ErrorDeals CR

on:
  schedule:
    # Cada 10 minutos (GitHub Actions mínimo es 5 min para repos públicos)
    - cron: '*/10 * * * *'
  workflow_dispatch:
    # Permite correr manualmente desde la pestaña Actions para debugging

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 8  # Abortar si tarda más de 8 min (evita solapamiento)

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: scraper/requirements.txt

      - name: Instalar dependencias Python
        run: pip install -r scraper/requirements.txt

      - name: Instalar Playwright Chromium
        run: playwright install chromium --with-deps

      - name: Correr scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          cd scraper
          python main.py

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: scraper-logs-${{ github.run_id }}
          path: scraper/*.log
          retention-days: 7
```

- [ ] **Step 2: Agregar secrets en GitHub**

1. Ir al repo en GitHub → Settings → Secrets and variables → Actions
2. Agregar:
   - `SUPABASE_URL` → valor del `.env`
   - `SUPABASE_SERVICE_KEY` → valor del `.env`

- [ ] **Step 3: Crear repo en GitHub y hacer push**

```bash
cd /Users/feli24a/Desktop/Proyectos/pricerrors
gh repo create errordeals-cr --public --source=. --remote=origin --push
```

- [ ] **Step 4: Verificar primer run manual**

```bash
gh workflow run scraper.yml
# Esperar ~2 minutos y ver logs:
gh run list --workflow=scraper.yml --limit=1
gh run view --log $(gh run list --workflow=scraper.yml --limit=1 --json databaseId --jq '.[0].databaseId')
```

Expected: logs mostrando productos scrapeados y snapshots guardados en Supabase.

- [ ] **Step 5: Commit**

```bash
git add .github/
git commit -m "feat: GitHub Actions workflow (cada 10 min)"
git push origin main
```

---

### Task 4: Purga de snapshots antiguos (costo cero en tier free)

**Files:**
- Create: `.github/workflows/cleanup.yml`

> Supabase tiene 500MB gratuitos. Con ~200 productos × ~144 runs/día × 30 días ≈ 864,000 filas de snapshots. Cada fila ocupa ~100 bytes → ~86MB/mes. La purga mensual mantiene el costo en cero.

- [ ] **Step 1: Crear workflow de limpieza mensual**

```yaml
# .github/workflows/cleanup.yml
name: Cleanup snapshots antiguos

on:
  schedule:
    # Primer día de cada mes a las 3 AM UTC
    - cron: '0 3 1 * *'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: scraper/requirements.txt

      - name: Instalar dependencias
        run: pip install -r scraper/requirements.txt

      - name: Purgar snapshots > 90 días
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          python - <<'EOF'
          import os
          from datetime import datetime, timedelta
          from supabase import create_client

          client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
          cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()

          result = client.table("price_snapshots").delete().lt("scraped_at", cutoff).execute()
          print(f"Snapshots eliminados: {len(result.data) if result.data else 'desconocido'}")

          # También limpiar logs del scraper > 30 días
          cutoff_logs = (datetime.utcnow() - timedelta(days=30)).isoformat()
          client.table("scraper_logs").delete().lt("ran_at", cutoff_logs).execute()
          print("Logs del scraper limpiados")
          EOF
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/cleanup.yml
git commit -m "chore: workflow mensual de purga de snapshots (>90 días)"
git push origin main
```

---

### Task 5: Verificación final end-to-end

- [ ] **Step 1: Confirmar que el scraper corre en Actions**

```bash
# Ver runs del workflow
gh run list --workflow=scraper.yml --limit=5
```

Expected: al menos 1 run con status ✓ (verde).

- [ ] **Step 2: Confirmar datos en Supabase**

Ir a Supabase → Table Editor → `price_snapshots`. Confirmar que hay filas con `scraped_at` reciente.

- [ ] **Step 3: Confirmar dashboard en Vercel**

Abrir la URL de Vercel. Confirmar:
- StatsHeader muestra números > 0
- Si hay alertas, aparecen en el feed
- Supabase Realtime funciona (insertar una alerta manualmente en Supabase y ver si aparece sin recargar)

- [ ] **Step 4: Verificar monitoreo de fallos**

```bash
# Ver últimos logs del scraper
gh run list --workflow=scraper.yml --limit=10 --json status,conclusion,createdAt | python3 -m json.tool
```

Expected: la mayoría son `completed` / `success`.

---

## Self-Review

### Cobertura del PRD

| Requerimiento | Task que lo implementa |
|---|---|
| US-14: Scraper automático cada 10 min | Task 3 (scraper.yml cron) |
| US-15: Logs de cada scraping | Task 2 (logger.py + scraper_logs) |
| US-17: Alerta si falla 3 veces consecutivas | Task 2 (get_consecutive_failures) |
| US-20: Archivar errores resueltos | Plan A Task 7 (publisher.py) |
| Costo $0 (MVP) | Tasks 3-4 (GitHub Actions gratis, purga mensual) |

### Costo estimado

| Servicio | Costo |
|---|---|
| GitHub Actions (repo público) | $0 (ilimitado) |
| Supabase (500MB free) | $0 con purga mensual |
| Vercel (hobby plan) | $0 |
| **Total mensual** | **$0** |
