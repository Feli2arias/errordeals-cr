# ErrorDeals CR

Monitor de errores de precio y descuentos fuertes en tiendas de Costa Rica: Walmart CR, Gollo y Tienda Monge. Un scraper revisa los precios cada 10 minutos, detecta caídas anómalas contra el historial y las publica en un dashboard en tiempo real.

## Funcionalidades

- Scraping periódico de categorías de electrónica, electrodomésticos, computación y televisión en tres tiendas
- Historial de precios por producto (un snapshot por corrida)
- Detección de errores de precio: alerta cuando el precio actual cae 60% o más respecto al promedio de los últimos 30 días (requiere al menos 5 snapshots previos)
- Resolución automática de la alerta cuando el precio vuelve a la normalidad
- Pestaña de descuentos reales: productos con 50% o más de rebaja sobre el precio original que la propia tienda muestra tachado
- Dashboard con filtro por tienda, contadores y actualización en tiempo real
- Registro de cada corrida del scraper y aviso en logs tras 3 fallos consecutivos por tienda
- Limpieza mensual automática de snapshots (más de 90 días) y logs (más de 30 días)

## Stack

- **Scraper:** Python 3.11, Playwright (Chromium), BeautifulSoup, PyYAML, pytest
- **Base de datos:** Supabase (PostgreSQL, Row Level Security, Realtime)
- **Frontend:** React 19, Vite, Tailwind CSS 3, Vitest y Testing Library
- **Automatización:** GitHub Actions (scraper cada 10 minutos y limpieza mensual)
- **Hosting del frontend:** Vercel (`frontend/vercel.json`)

## Cómo funciona

```
GitHub Actions (cada 10 min)
        │
        ▼
 scraper/ (Playwright + adaptadores por tienda)
        │  productos y precios
        ▼
 Supabase: products · price_snapshots · alerts · scraper_logs
        │
        ▼
 frontend/ (React, lectura pública con anon key + Realtime)
```

Cada tienda tiene un adaptador en `scraper/adapters/` y sus selectores CSS y URLs de categoría en `scraper/config/stores.yaml`. Los umbrales de detección se configuran en `scraper/config/settings.yaml`.

## Correrlo localmente

### Requisitos

- Python 3.11+
- Node.js 20+
- Un proyecto de Supabase (el plan gratuito alcanza)

### 1. Base de datos

Ejecutá en el SQL Editor de Supabase, en orden, los archivos de `supabase/migrations/` (`001`, `002` y `003`).

### 2. Scraper

```bash
cp .env.example .env        # completá las variables
cd scraper
pip install -r requirements.txt
playwright install chromium
python main.py
```

Tests:

```bash
cd scraper
pytest
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env        # completá las variables
npm install
npm run dev
```

Tests: `npm run test:run`. Build de producción: `npm run build`.

## Variables de entorno

Solo los nombres; los valores van en tus archivos `.env` (ignorados por git).

| Variable | Dónde | Uso |
|---|---|---|
| `SUPABASE_URL` | `.env` raíz y secret de GitHub Actions | URL del proyecto de Supabase |
| `SUPABASE_SERVICE_KEY` | `.env` raíz y secret de GitHub Actions | Clave de servicio para que el scraper escriba. Nunca debe llegar al frontend |
| `VITE_SUPABASE_URL` | `frontend/.env` | URL del proyecto, para el dashboard |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | Clave anónima (solo lectura por RLS) |

Para que los workflows corran en tu fork, cargá `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` en Settings → Secrets and variables → Actions.

## Estructura del proyecto

```
errordeals-cr/
├── scraper/         # Scraper en Python
│   ├── adapters/    # Walmart, Gollo y Monge
│   ├── config/      # stores.yaml y settings.yaml
│   ├── detector.py  # Reglas de detección de anomalías
│   ├── publisher.py # Alta y resolución de alertas
│   └── tests/
├── frontend/        # Dashboard React + Vite
├── supabase/        # Migraciones SQL
├── .github/workflows/  # scraper.yml y cleanup.yml
└── docs/            # Planes de implementación
```

## Estado del proyecto

MVP funcional: scraper, detección, dashboard y automatización con GitHub Actions están implementados y cubiertos por tests. El proyecto depende de los selectores HTML de cada tienda, por lo que un rediseño de sus sitios puede requerir actualizar `stores.yaml`.

## Licencia

[MIT](LICENSE)
