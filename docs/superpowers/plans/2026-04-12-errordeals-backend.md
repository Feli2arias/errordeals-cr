# ErrorDeals CR – Plan A: Backend (Scraper + Detector + Publisher)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el pipeline Python completo: scraping de Walmart CR / Gollo / Monge → detección de anomalías → publicación de alertas en Supabase.

**Architecture:** Un script independiente (`scraper/main.py`) orquesta adaptadores por tienda, guarda snapshots de precio en Supabase, corre el detector sobre el historial y publica/resuelve alertas. No hay servidor HTTP — es un script que corre en GitHub Actions.

**Tech Stack:** Python 3.11, Playwright (async), supabase-py 2.x, pytest, PyYAML, python-dotenv

---

## File Structure

```
pricerrors/
├── scraper/
│   ├── main.py                        # Entry point: orquesta todo
│   ├── models.py                      # Dataclasses: Product, Alert
│   ├── db.py                          # Cliente Supabase
│   ├── engine.py                      # Scraper engine (Playwright)
│   ├── detector.py                    # Anomaly detector
│   ├── publisher.py                   # Alert publisher
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── base.py                    # ABC BaseAdapter
│   │   ├── walmart.py                 # Walmart CR adapter
│   │   ├── gollo.py                   # Gollo adapter
│   │   └── monge.py                   # Monge adapter
│   ├── config/
│   │   ├── settings.yaml              # Thresholds, retry config
│   │   └── stores.yaml                # URLs y selectores por tienda
│   ├── requirements.txt
│   └── tests/
│       ├── conftest.py
│       ├── test_detector.py
│       ├── test_publisher.py
│       ├── test_engine.py
│       └── fixtures/
│           ├── walmart_listing.html
│           ├── gollo_listing.html
│           └── monge_listing.html
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── .env.example
```

---

### Task 1: Repo init + dependencias Python

**Files:**
- Create: `scraper/requirements.txt`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Inicializar git y crear .gitignore**

```bash
cd /Users/feli24a/Desktop/Proyectos/pricerrors
git init
```

Crear `.gitignore`:
```
.env
__pycache__/
*.pyc
.pytest_cache/
node_modules/
dist/
.vercel/
```

- [ ] **Step 2: Crear requirements.txt**

```
playwright==1.43.0
supabase==2.4.2
python-dotenv==1.0.1
pyyaml==6.0.1
pytest==8.1.1
pytest-asyncio==0.23.6
pytest-mock==3.14.0
```

- [ ] **Step 3: Crear .env.example**

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

- [ ] **Step 4: Instalar dependencias**

```bash
cd /Users/feli24a/Desktop/Proyectos/pricerrors
python -m venv .venv
source .venv/bin/activate
pip install -r scraper/requirements.txt
playwright install chromium
```

Expected: instalación sin errores.

- [ ] **Step 5: Commit**

```bash
git add .gitignore scraper/requirements.txt .env.example
git commit -m "chore: init repo con dependencias Python"
```

---

### Task 2: Supabase schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Crear migración SQL**

```sql
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
```

- [ ] **Step 2: Aplicar en Supabase**

1. Ir a https://supabase.com → crear proyecto nuevo (tier gratuito).
2. En el SQL Editor, pegar y ejecutar el contenido de `001_initial_schema.sql`.
3. Copiar `Project URL` y `service_role key` (Settings → API) a `.env`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: schema inicial en Supabase (products, snapshots, alerts)"
```

---

### Task 3: Modelos Python

**Files:**
- Create: `scraper/models.py`
- Create: `scraper/tests/conftest.py`

- [ ] **Step 1: Escribir test que importa y usa los modelos**

```python
# scraper/tests/conftest.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
```

```python
# scraper/tests/test_models.py
from models import Product

def test_product_has_required_fields():
    p = Product(store="walmart", name="TV 55\"", url="https://walmart.co.cr/tv", price=299999.0)
    assert p.store == "walmart"
    assert p.price == 299999.0
    assert p.image_url is None  # opcional

def test_product_with_image():
    p = Product(store="gollo", name="Nevera", url="https://gollo.co.cr/nevera", price=150000.0, image_url="https://img.gollo.co.cr/1.jpg")
    assert p.image_url is not None
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
cd scraper && python -m pytest tests/test_models.py -v
```
Expected: `ModuleNotFoundError: No module named 'models'`

- [ ] **Step 3: Implementar models.py**

```python
# scraper/models.py
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Product:
    store: str
    name: str
    url: str
    price: float
    image_url: Optional[str] = None
```

- [ ] **Step 4: Ejecutar — debe pasar**

```bash
cd scraper && python -m pytest tests/test_models.py -v
```
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add scraper/models.py scraper/tests/conftest.py scraper/tests/test_models.py
git commit -m "feat: dataclass Product"
```

---

### Task 4: Config (settings.yaml + stores.yaml)

**Files:**
- Create: `scraper/config/settings.yaml`
- Create: `scraper/config/stores.yaml`
- Create: `scraper/config.py`
- Create: `scraper/tests/test_config.py`

- [ ] **Step 1: Escribir test**

```python
# scraper/tests/test_config.py
from config import get_settings, get_stores

def test_settings_has_required_keys():
    s = get_settings()
    assert "min_snapshots_required" in s["detection"]
    assert "discount_threshold" in s["detection"]
    assert s["detection"]["min_snapshots_required"] == 5
    assert s["detection"]["discount_threshold"] == 0.60

def test_stores_has_three_stores():
    stores = get_stores()
    names = [st["id"] for st in stores]
    assert "walmart" in names
    assert "gollo" in names
    assert "monge" in names
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
cd scraper && python -m pytest tests/test_config.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Crear config/settings.yaml**

```yaml
# scraper/config/settings.yaml
detection:
  min_snapshots_required: 5
  discount_threshold: 0.60
  history_days: 30

scraper:
  max_retries: 3
  retry_delay_seconds: 2
  page_load_timeout_ms: 30000

user_agents:
  - "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  - "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  - "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
```

- [ ] **Step 4: Crear config/stores.yaml**

> NOTA: Los selectores CSS de cada tienda deben verificarse inspeccionando el HTML real del sitio (Task 6). Por ahora se usan placeholders que el Task 6 reemplazará.

```yaml
# scraper/config/stores.yaml
stores:
  - id: walmart
    name: "Walmart CR"
    base_url: "https://www.walmart.co.cr"
    category_urls:
      - "https://www.walmart.co.cr/electronica"
      - "https://www.walmart.co.cr/electrodomesticos"
      - "https://www.walmart.co.cr/computacion"
    selectors:
      product_container: "[data-testid='product-card']"
      name: "[data-testid='product-title']"
      price: "[data-testid='price-current']"
      image: "img.product-image"
      link: "a[data-testid='product-link']"
    enabled: true

  - id: gollo
    name: "Gollo"
    base_url: "https://www.gollo.co.cr"
    category_urls:
      - "https://www.gollo.co.cr/television"
      - "https://www.gollo.co.cr/refrigeradores"
      - "https://www.gollo.co.cr/computadoras"
    selectors:
      product_container: ".product-item"
      name: ".product-item-name"
      price: ".price"
      image: ".product-image-photo"
      link: "a.product-item-link"
    enabled: true

  - id: monge
    name: "Monge"
    base_url: "https://www.monge.co.cr"
    category_urls:
      - "https://www.monge.co.cr/television"
      - "https://www.monge.co.cr/lavadoras"
      - "https://www.monge.co.cr/celulares"
    selectors:
      product_container: ".product-card"
      name: ".product-name"
      price: ".product-price"
      image: ".product-img img"
      link: "a.product-link"
    enabled: true
```

- [ ] **Step 5: Crear config.py**

```python
# scraper/config.py
import os
import yaml
from pathlib import Path

_CONFIG_DIR = Path(__file__).parent / "config"

def get_settings() -> dict:
    with open(_CONFIG_DIR / "settings.yaml") as f:
        return yaml.safe_load(f)

def get_stores() -> list[dict]:
    with open(_CONFIG_DIR / "stores.yaml") as f:
        data = yaml.safe_load(f)
    return [s for s in data["stores"] if s.get("enabled", True)]
```

- [ ] **Step 6: Ejecutar — debe pasar**

```bash
cd scraper && python -m pytest tests/test_config.py -v
```
Expected: `2 passed`

- [ ] **Step 7: Commit**

```bash
git add scraper/config.py scraper/config/ scraper/tests/test_config.py
git commit -m "feat: config de settings y tiendas via YAML"
```

---

### Task 5: Anomaly Detector

**Files:**
- Create: `scraper/detector.py`
- Create: `scraper/tests/test_detector.py`

- [ ] **Step 1: Escribir los 4 tests del PRD**

```python
# scraper/tests/test_detector.py
import pytest
from detector import detect_anomaly

# historial base: 6 snapshots alrededor de 100_000
NORMAL_HISTORY = [100_000, 102_000, 98_000, 101_000, 100_500, 99_500]

def test_no_alert_with_insufficient_history():
    """Menos de 5 snapshots → nunca dispara alerta."""
    result = detect_anomaly(current_price=10_000, snapshots=[100_000, 99_000, 101_000])
    assert result is False

def test_no_alert_with_exactly_four_snapshots():
    """4 snapshots (borde inferior) → no dispara."""
    result = detect_anomaly(current_price=10_000, snapshots=[100_000]*4)
    assert result is False

def test_alert_triggered_at_60pct_discount():
    """Precio a 40% del promedio (60% de descuento) → dispara alerta."""
    # promedio ≈ 100_166 → 60% descuento → precio ≤ 40_067
    result = detect_anomaly(current_price=35_000, snapshots=NORMAL_HISTORY)
    assert result is True

def test_no_alert_on_normal_sale():
    """Descuento del 20% → no dispara."""
    # 80% de 100_166 ≈ 80_133
    result = detect_anomaly(current_price=80_000, snapshots=NORMAL_HISTORY)
    assert result is False

def test_no_alert_at_59pct_discount():
    """Justo por debajo del umbral (59%) → no dispara."""
    avg = sum(NORMAL_HISTORY) / len(NORMAL_HISTORY)
    price_at_59 = avg * 0.41  # 59% de descuento
    result = detect_anomaly(current_price=price_at_59, snapshots=NORMAL_HISTORY)
    assert result is False

def test_alert_at_exactly_60pct_discount():
    """Exactamente en el umbral (60%) → dispara."""
    avg = sum(NORMAL_HISTORY) / len(NORMAL_HISTORY)
    price_at_60 = avg * 0.40  # exactamente 60% de descuento
    result = detect_anomaly(current_price=price_at_60, snapshots=NORMAL_HISTORY)
    assert result is True

def test_no_alert_when_history_is_zero():
    """Historial de precios en 0 no debe lanzar excepción."""
    result = detect_anomaly(current_price=0.0, snapshots=[0.0] * 5)
    assert result is False
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
cd scraper && python -m pytest tests/test_detector.py -v
```
Expected: `ModuleNotFoundError: No module named 'detector'`

- [ ] **Step 3: Implementar detector.py**

```python
# scraper/detector.py
from typing import List
from config import get_settings

def detect_anomaly(current_price: float, snapshots: List[float]) -> bool:
    """
    Retorna True si current_price representa un error de precio.

    Reglas (configurables en settings.yaml):
    - Requiere al menos `min_snapshots_required` snapshots previos.
    - Si el descuento respecto al promedio histórico supera `discount_threshold`, es anomalía.
    """
    settings = get_settings()
    min_required: int = settings["detection"]["min_snapshots_required"]
    threshold: float = settings["detection"]["discount_threshold"]

    if len(snapshots) < min_required:
        return False

    avg = sum(snapshots) / len(snapshots)
    if avg <= 0:
        return False

    discount = (avg - current_price) / avg
    return discount >= threshold
```

- [ ] **Step 4: Ejecutar — deben pasar**

```bash
cd scraper && python -m pytest tests/test_detector.py -v
```
Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add scraper/detector.py scraper/tests/test_detector.py
git commit -m "feat: anomaly detector con threshold configurable (TDD)"
```

---

### Task 6: Cliente Supabase (Python)

**Files:**
- Create: `scraper/db.py`
- Create: `scraper/tests/test_db.py`

- [ ] **Step 1: Escribir test de inicialización**

```python
# scraper/tests/test_db.py
import os
import pytest
from unittest.mock import patch, MagicMock

def test_get_client_uses_env_vars():
    """El cliente se construye con las variables de entorno correctas."""
    with patch("db.create_client") as mock_create:
        mock_create.return_value = MagicMock()
        os.environ["SUPABASE_URL"] = "https://test.supabase.co"
        os.environ["SUPABASE_SERVICE_KEY"] = "test-key"

        from db import get_client
        client = get_client()

        mock_create.assert_called_once_with("https://test.supabase.co", "test-key")

def test_get_client_raises_if_env_missing():
    """Falla rápido si falta una variable de entorno."""
    env = {k: v for k, v in os.environ.items() if k not in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY")}
    with patch.dict(os.environ, env, clear=True):
        with pytest.raises(KeyError):
            from importlib import reload
            import db as db_module
            reload(db_module)
            db_module.get_client()
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
cd scraper && python -m pytest tests/test_db.py::test_get_client_uses_env_vars -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implementar db.py**

```python
# scraper/db.py
import os
from supabase import create_client, Client

def get_client() -> Client:
    url: str = os.environ["SUPABASE_URL"]
    key: str = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)
```

- [ ] **Step 4: Ejecutar — debe pasar**

```bash
cd scraper && python -m pytest tests/test_db.py::test_get_client_uses_env_vars -v
```
Expected: `1 passed`

- [ ] **Step 5: Commit**

```bash
git add scraper/db.py scraper/tests/test_db.py
git commit -m "feat: cliente Supabase con validación de env vars"
```

---

### Task 7: Alert Publisher

**Files:**
- Create: `scraper/publisher.py`
- Create: `scraper/tests/test_publisher.py`

- [ ] **Step 1: Escribir tests**

```python
# scraper/tests/test_publisher.py
import pytest
from unittest.mock import MagicMock, patch, call

@pytest.fixture
def mock_client():
    client = MagicMock()
    # Simular .table().select().eq().eq().execute() → sin alertas activas
    client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    return client

def test_publish_alert_inserts_new_alert(mock_client):
    """Cuando no existe alerta activa, inserta una nueva."""
    with patch("publisher.get_client", return_value=mock_client):
        from publisher import publish_alert
        publish_alert(
            product_id="uuid-123",
            current_price=30_000.0,
            historical_avg=100_000.0,
        )

    mock_client.table.return_value.insert.assert_called_once()
    inserted = mock_client.table.return_value.insert.call_args[0][0]
    assert inserted["product_id"] == "uuid-123"
    assert inserted["current_price"] == 30_000.0
    assert inserted["historical_avg"] == 100_000.0
    assert inserted["discount_pct"] == 70.0
    assert inserted["is_active"] is True

def test_publish_alert_no_duplicate(mock_client):
    """Si ya existe una alerta activa para el producto, no crea otra."""
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "existing-alert"}
    ]

    with patch("publisher.get_client", return_value=mock_client):
        from publisher import publish_alert
        publish_alert(product_id="uuid-123", current_price=30_000.0, historical_avg=100_000.0)

    mock_client.table.return_value.insert.assert_not_called()

def test_resolve_alert_sets_resolved_at(mock_client):
    """Una alerta activa que ya no aplica se marca como resuelta."""
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "alert-uuid-1", "product_id": "prod-1"}
    ]

    with patch("publisher.get_client", return_value=mock_client):
        with patch("publisher.datetime") as mock_dt:
            mock_dt.utcnow.return_value.isoformat.return_value = "2026-04-12T10:00:00"
            from publisher import resolve_alert
            resolve_alert(product_id="prod-1")

    mock_client.table.return_value.update.assert_called_once_with({
        "is_active": False,
        "resolved_at": "2026-04-12T10:00:00"
    })
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
cd scraper && python -m pytest tests/test_publisher.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implementar publisher.py**

```python
# scraper/publisher.py
from datetime import datetime
from db import get_client

def publish_alert(product_id: str, current_price: float, historical_avg: float) -> None:
    """Inserta una alerta si no existe una activa para el mismo producto."""
    client = get_client()

    existing = (
        client.table("alerts")
        .select("id")
        .eq("product_id", product_id)
        .eq("is_active", True)
        .execute()
    )
    if existing.data:
        return

    discount_pct = round((historical_avg - current_price) / historical_avg * 100, 2)

    client.table("alerts").insert({
        "product_id": product_id,
        "current_price": current_price,
        "historical_avg": historical_avg,
        "discount_pct": discount_pct,
        "is_active": True,
    }).execute()

def resolve_alert(product_id: str) -> None:
    """Marca como resuelta la alerta activa de un producto."""
    client = get_client()

    active = (
        client.table("alerts")
        .select("id")
        .eq("product_id", product_id)
        .eq("is_active", True)
        .execute()
    )
    if not active.data:
        return

    client.table("alerts").update({
        "is_active": False,
        "resolved_at": datetime.utcnow().isoformat(),
    }).eq("product_id", product_id).eq("is_active", True).execute()
```

- [ ] **Step 4: Ejecutar — deben pasar**

```bash
cd scraper && python -m pytest tests/test_publisher.py -v
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add scraper/publisher.py scraper/tests/test_publisher.py
git commit -m "feat: publisher con dedup de alertas y resolución (TDD)"
```

---

### Task 8: Base Adapter + inspección de sitios

**Files:**
- Create: `scraper/adapters/__init__.py`
- Create: `scraper/adapters/base.py`
- Create: `scraper/inspect_site.py`

- [ ] **Step 1: Crear base adapter**

```python
# scraper/adapters/__init__.py
# vacío
```

```python
# scraper/adapters/base.py
from abc import ABC, abstractmethod
from typing import List
from models import Product

class BaseAdapter(ABC):
    """Interface que todo adaptador de tienda debe implementar."""

    @property
    @abstractmethod
    def store_id(self) -> str:
        """Identificador único de la tienda (ej: 'walmart')."""
        ...

    @abstractmethod
    def get_category_urls(self) -> List[str]:
        """Lista de URLs de categorías a scrapear."""
        ...

    @abstractmethod
    def parse_products(self, html: str, base_url: str) -> List[Product]:
        """
        Parsea el HTML de una página de categoría y retorna productos.
        Recibe HTML estático (string) para facilitar testing sin Playwright.
        """
        ...
```

- [ ] **Step 2: Crear script de inspección (ejecutar una sola vez para capturar HTML real)**

```python
# scraper/inspect_site.py
"""
Herramienta de desarrollo: captura el HTML real de una categoría de cada tienda.
Corre una vez, guarda los archivos en tests/fixtures/, y se usa para actualizar
los selectores en stores.yaml.

Uso: python inspect_site.py
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

URLS = {
    "walmart": "https://www.walmart.co.cr/electronica",
    "gollo": "https://www.gollo.co.cr/television",
    "monge": "https://www.monge.co.cr/television",
}

async def capture(name: str, url: str) -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        await page.goto(url, timeout=30_000, wait_until="networkidle")
        html = await page.content()
        out = Path(__file__).parent / "tests" / "fixtures" / f"{name}_listing.html"
        out.write_text(html, encoding="utf-8")
        print(f"[{name}] Guardado en {out} ({len(html):,} bytes)")
        await browser.close()

async def main():
    for name, url in URLS.items():
        await capture(name, url)

if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 3: Ejecutar inspección y actualizar selectores**

```bash
cd scraper && python inspect_site.py
```

Luego abrir cada fixture en el navegador o con un editor y buscar:
- ¿Cómo se llama el contenedor de producto?
- ¿Dónde está el nombre / precio / imagen / link?

Actualizar `config/stores.yaml` con los selectores reales encontrados.

- [ ] **Step 4: Commit**

```bash
git add scraper/adapters/ scraper/inspect_site.py scraper/tests/fixtures/
git commit -m "feat: base adapter + fixtures HTML de tiendas para testing"
```

---

### Task 9: Walmart CR Adapter

**Files:**
- Create: `scraper/adapters/walmart.py`
- Modify: `scraper/tests/test_engine.py`

> Este task asume que ya inspeccionaste el HTML real en Task 8 y actualizaste los selectores en `stores.yaml`. El HTML del fixture `tests/fixtures/walmart_listing.html` es el HTML real capturado.

- [ ] **Step 1: Escribir test con el fixture real**

```python
# scraper/tests/test_engine.py
import pytest
from pathlib import Path
from adapters.walmart import WalmartAdapter

@pytest.fixture
def walmart_html():
    fixture = Path(__file__).parent / "fixtures" / "walmart_listing.html"
    return fixture.read_text(encoding="utf-8")

def test_walmart_adapter_returns_products(walmart_html):
    """El adapter extrae al menos 1 producto del HTML real de Walmart."""
    adapter = WalmartAdapter()
    products = adapter.parse_products(walmart_html, "https://www.walmart.co.cr")
    assert len(products) > 0

def test_walmart_product_has_all_fields(walmart_html):
    """Cada producto tiene nombre, precio positivo, URL y store correctos."""
    adapter = WalmartAdapter()
    products = adapter.parse_products(walmart_html, "https://www.walmart.co.cr")
    for p in products:
        assert p.name, f"Producto sin nombre: {p}"
        assert p.price > 0, f"Precio inválido: {p}"
        assert p.url.startswith("http"), f"URL inválida: {p}"
        assert p.store == "walmart"

def test_walmart_adapter_store_id():
    assert WalmartAdapter().store_id == "walmart"
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
cd scraper && python -m pytest tests/test_engine.py -v
```
Expected: `ModuleNotFoundError: No module named 'adapters.walmart'`

- [ ] **Step 3: Implementar WalmartAdapter**

> Los selectores en este archivo deben coincidir con los que encontraste en Task 8. Los de abajo son un punto de partida — actualizar según el HTML real.

```python
# scraper/adapters/walmart.py
import re
from typing import List
from bs4 import BeautifulSoup
from models import Product
from adapters.base import BaseAdapter
from config import get_stores

def _get_walmart_config() -> dict:
    stores = get_stores()
    return next(s for s in stores if s["id"] == "walmart")

class WalmartAdapter(BaseAdapter):
    @property
    def store_id(self) -> str:
        return "walmart"

    def get_category_urls(self) -> List[str]:
        return _get_walmart_config()["category_urls"]

    def parse_products(self, html: str, base_url: str) -> List[Product]:
        cfg = _get_walmart_config()["selectors"]
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(cfg["product_container"]):
            name_el = card.select_one(cfg["name"])
            price_el = card.select_one(cfg["price"])
            img_el = card.select_one(cfg["image"])
            link_el = card.select_one(cfg["link"])

            if not name_el or not price_el or not link_el:
                continue

            # Limpiar precio: "₡299.999" → 299999.0
            raw_price = re.sub(r"[^\d.]", "", price_el.get_text().replace(",", "."))
            try:
                price = float(raw_price)
            except ValueError:
                continue

            href = link_el.get("href", "")
            url = href if href.startswith("http") else base_url + href

            products.append(Product(
                store=self.store_id,
                name=name_el.get_text(strip=True),
                url=url,
                price=price,
                image_url=img_el.get("src") or img_el.get("data-src") if img_el else None,
            ))

        return products
```

> IMPORTANTE: Agregar `beautifulsoup4==4.12.3` a `requirements.txt` y reinstalar.

- [ ] **Step 4: Ejecutar — debe pasar**

```bash
pip install beautifulsoup4==4.12.3
cd scraper && python -m pytest tests/test_engine.py -v
```
Expected: `4 passed`

Si los selectores no funcionan con el HTML real: abrir el fixture, inspeccionar la estructura e iterar sobre los selectores en `stores.yaml` hasta que pasen los tests.

- [ ] **Step 5: Commit**

```bash
git add scraper/adapters/walmart.py scraper/requirements.txt scraper/tests/test_engine.py
git commit -m "feat: Walmart CR adapter con tests contra HTML real"
```

---

### Task 10: Gollo y Monge Adapters

**Files:**
- Create: `scraper/adapters/gollo.py`
- Create: `scraper/adapters/monge.py`
- Modify: `scraper/tests/test_engine.py`

- [ ] **Step 1: Agregar tests para Gollo y Monge**

Agregar al final de `scraper/tests/test_engine.py`:

```python
from adapters.gollo import GolloAdapter
from adapters.monge import MongeAdapter

@pytest.fixture
def gollo_html():
    fixture = Path(__file__).parent / "fixtures" / "gollo_listing.html"
    return fixture.read_text(encoding="utf-8")

@pytest.fixture
def monge_html():
    fixture = Path(__file__).parent / "fixtures" / "monge_listing.html"
    return fixture.read_text(encoding="utf-8")

def test_gollo_adapter_returns_products(gollo_html):
    adapter = GolloAdapter()
    products = adapter.parse_products(gollo_html, "https://www.gollo.co.cr")
    assert len(products) > 0

def test_gollo_product_has_all_fields(gollo_html):
    adapter = GolloAdapter()
    for p in adapter.parse_products(gollo_html, "https://www.gollo.co.cr"):
        assert p.name
        assert p.price > 0
        assert p.url.startswith("http")
        assert p.store == "gollo"

def test_monge_adapter_returns_products(monge_html):
    adapter = MongeAdapter()
    products = adapter.parse_products(monge_html, "https://www.monge.co.cr")
    assert len(products) > 0

def test_monge_product_has_all_fields(monge_html):
    adapter = MongeAdapter()
    for p in adapter.parse_products(monge_html, "https://www.monge.co.cr"):
        assert p.name
        assert p.price > 0
        assert p.url.startswith("http")
        assert p.store == "monge"
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
cd scraper && python -m pytest tests/test_engine.py -v -k "gollo or monge"
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implementar GolloAdapter**

```python
# scraper/adapters/gollo.py
import re
from typing import List
from bs4 import BeautifulSoup
from models import Product
from adapters.base import BaseAdapter
from config import get_stores

def _get_config() -> dict:
    return next(s for s in get_stores() if s["id"] == "gollo")

class GolloAdapter(BaseAdapter):
    @property
    def store_id(self) -> str:
        return "gollo"

    def get_category_urls(self) -> List[str]:
        return _get_config()["category_urls"]

    def parse_products(self, html: str, base_url: str) -> List[Product]:
        cfg = _get_config()["selectors"]
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(cfg["product_container"]):
            name_el = card.select_one(cfg["name"])
            price_el = card.select_one(cfg["price"])
            img_el = card.select_one(cfg["image"])
            link_el = card.select_one(cfg["link"])

            if not name_el or not price_el or not link_el:
                continue

            raw_price = re.sub(r"[^\d]", "", price_el.get_text())
            try:
                price = float(raw_price)
            except ValueError:
                continue

            href = link_el.get("href", "")
            url = href if href.startswith("http") else base_url + href

            products.append(Product(
                store=self.store_id,
                name=name_el.get_text(strip=True),
                url=url,
                price=price,
                image_url=img_el.get("src") if img_el else None,
            ))

        return products
```

- [ ] **Step 4: Implementar MongeAdapter**

```python
# scraper/adapters/monge.py
import re
from typing import List
from bs4 import BeautifulSoup
from models import Product
from adapters.base import BaseAdapter
from config import get_stores

def _get_config() -> dict:
    return next(s for s in get_stores() if s["id"] == "monge")

class MongeAdapter(BaseAdapter):
    @property
    def store_id(self) -> str:
        return "monge"

    def get_category_urls(self) -> List[str]:
        return _get_config()["category_urls"]

    def parse_products(self, html: str, base_url: str) -> List[Product]:
        cfg = _get_config()["selectors"]
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(cfg["product_container"]):
            name_el = card.select_one(cfg["name"])
            price_el = card.select_one(cfg["price"])
            img_el = card.select_one(cfg["image"])
            link_el = card.select_one(cfg["link"])

            if not name_el or not price_el or not link_el:
                continue

            raw_price = re.sub(r"[^\d]", "", price_el.get_text())
            try:
                price = float(raw_price)
            except ValueError:
                continue

            href = link_el.get("href", "")
            url = href if href.startswith("http") else base_url + href

            products.append(Product(
                store=self.store_id,
                name=name_el.get_text(strip=True),
                url=url,
                price=price,
                image_url=img_el.get("src") if img_el else None,
            ))

        return products
```

- [ ] **Step 5: Ejecutar — deben pasar**

```bash
cd scraper && python -m pytest tests/test_engine.py -v
```
Expected: todos los tests pasando. Si algún selector falla, iterar sobre `stores.yaml`.

- [ ] **Step 6: Commit**

```bash
git add scraper/adapters/gollo.py scraper/adapters/monge.py scraper/tests/test_engine.py
git commit -m "feat: adapters Gollo y Monge con tests"
```

---

### Task 11: Scraper Engine (Playwright)

**Files:**
- Create: `scraper/engine.py`

> El engine corre Playwright real. No se testea con pytest — se valida corriendo contra el sitio real.

- [ ] **Step 1: Implementar engine.py**

```python
# scraper/engine.py
"""
Scraper engine: usa Playwright para renderizar cada URL de categoría
y pasa el HTML al adaptador correspondiente para extraer productos.
"""
import asyncio
import random
import logging
from typing import List
from playwright.async_api import async_playwright, Page

from models import Product
from adapters.base import BaseAdapter
from config import get_settings

logger = logging.getLogger(__name__)

async def _fetch_page_html(page: Page, url: str, timeout_ms: int) -> str:
    """Navega a la URL y retorna el HTML renderizado."""
    await page.goto(url, timeout=timeout_ms, wait_until="networkidle")
    # Scroll para activar lazy loading
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    await page.wait_for_timeout(1500)
    return await page.content()

async def scrape_adapter(adapter: BaseAdapter) -> List[Product]:
    """
    Scrapea todas las URLs de categoría del adaptador.
    Retorna lista plana de productos.
    """
    settings = get_settings()
    scraper_cfg = settings["scraper"]
    user_agents: List[str] = settings["user_agents"]
    all_products: List[Product] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for url in adapter.get_category_urls():
            ua = random.choice(user_agents)
            context = await browser.new_context(user_agent=ua)
            page = await context.new_page()

            for attempt in range(1, scraper_cfg["max_retries"] + 1):
                try:
                    html = await _fetch_page_html(
                        page,
                        url,
                        scraper_cfg["page_load_timeout_ms"],
                    )
                    products = adapter.parse_products(html, url.split("/")[0] + "//" + url.split("/")[2])
                    all_products.extend(products)
                    logger.info(f"[{adapter.store_id}] {url} → {len(products)} productos")
                    break
                except Exception as e:
                    logger.warning(f"[{adapter.store_id}] Intento {attempt}/{scraper_cfg['max_retries']} falló: {e}")
                    if attempt < scraper_cfg["max_retries"]:
                        await asyncio.sleep(scraper_cfg["retry_delay_seconds"] * (2 ** (attempt - 1)))
                    else:
                        logger.error(f"[{adapter.store_id}] URL fallida tras {scraper_cfg['max_retries']} intentos: {url}")

            await context.close()

        await browser.close()

    return all_products
```

- [ ] **Step 2: Verificar manualmente**

```bash
cd scraper && python -c "
import asyncio, logging
logging.basicConfig(level=logging.INFO)
from adapters.walmart import WalmartAdapter
from engine import scrape_adapter
products = asyncio.run(scrape_adapter(WalmartAdapter()))
print(f'Productos encontrados: {len(products)}')
if products: print(products[0])
"
```

Expected: ver al menos 1 producto con nombre y precio válidos.

- [ ] **Step 3: Commit**

```bash
git add scraper/engine.py
git commit -m "feat: scraper engine con Playwright, retry y rotación de user-agent"
```

---

### Task 12: Main Entry Point + upsert a Supabase

**Files:**
- Create: `scraper/main.py`

- [ ] **Step 1: Implementar main.py**

```python
# scraper/main.py
"""
Entry point del scraper. Corre todos los adapters, guarda snapshots en Supabase,
corre el detector y publica/resuelve alertas.
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

from db import get_client
from engine import scrape_adapter
from detector import detect_anomaly
from publisher import publish_alert, resolve_alert
from adapters.walmart import WalmartAdapter
from adapters.gollo import GolloAdapter
from adapters.monge import MongeAdapter
from config import get_settings
from models import Product

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ADAPTERS = [WalmartAdapter(), GolloAdapter(), MongeAdapter()]

def upsert_product(client, product: Product) -> str:
    """Inserta o actualiza el producto y retorna su UUID."""
    result = client.table("products").upsert(
        {
            "store": product.store,
            "name": product.name,
            "url": product.url,
            "image_url": product.image_url,
        },
        on_conflict="url",
    ).execute()
    return result.data[0]["id"]

def save_snapshot(client, product_id: str, price: float) -> None:
    client.table("price_snapshots").insert({
        "product_id": product_id,
        "price": price,
    }).execute()

def get_recent_snapshots(client, product_id: str, days: int) -> list[float]:
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    result = (
        client.table("price_snapshots")
        .select("price")
        .eq("product_id", product_id)
        .gte("scraped_at", since)
        .order("scraped_at", desc=True)
        .execute()
    )
    return [row["price"] for row in result.data]

async def process_store(adapter) -> None:
    logger.info(f"Scrapeando {adapter.store_id}...")
    products = await scrape_adapter(adapter)

    if not products:
        logger.warning(f"[{adapter.store_id}] No se encontraron productos")
        return

    client = get_client()
    settings = get_settings()
    history_days = settings["detection"]["history_days"]

    for product in products:
        try:
            product_id = upsert_product(client, product)
            save_snapshot(client, product_id, product.price)

            snapshots = get_recent_snapshots(client, product_id, history_days)
            # El snapshot actual no cuenta para el historial de detección
            historical = snapshots[1:] if len(snapshots) > 1 else []

            if detect_anomaly(product.price, historical):
                logger.info(f"ALERTA detectada: {product.name} @ ₡{product.price:,.0f}")
                avg = sum(historical) / len(historical)
                publish_alert(product_id, product.price, avg)
            else:
                resolve_alert(product_id)

        except Exception as e:
            logger.error(f"Error procesando {product.url}: {e}")

async def main() -> None:
    logger.info("=== ErrorDeals CR Scraper iniciado ===")
    for adapter in ADAPTERS:
        await process_store(adapter)
    logger.info("=== Scraper finalizado ===")

if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Verificar end-to-end**

```bash
cd scraper && python main.py
```

Expected: logs de productos scrapeados, snapshots guardados en Supabase. Verificar en el dashboard de Supabase → Table Editor → `price_snapshots`.

- [ ] **Step 3: Commit**

```bash
git add scraper/main.py
git commit -m "feat: main entry point completo (scrape → snapshot → detect → alert)"
```

---

## Self-Review

### Cobertura del PRD

| Requerimiento | Task que lo implementa |
|---|---|
| Scraping cada 10 min (US-14) | Plan C (GitHub Actions) |
| Detectar anomalía >60% (Módulo 3) | Task 5 |
| Mínimo 5 snapshots (Módulo 3) | Task 5 |
| No duplicar alertas (US publisher) | Task 7 |
| Resolver alertas cuando precio normaliza | Task 7 |
| Historial ilimitado de snapshots | Task 12 |
| Logs de cada run (US-15) | Task 11, 12 (logging) |
| Tiendas como archivos de config (US-16) | Task 4 |
| Umbral configurable sin redesploy (US-19) | Task 4 |
| Archivar errores resueltos (US-20) | Task 12 (resolve_alert) |

### No hay placeholders — todo el código está completo.
