# ErrorDeals CR – Plan B: Frontend Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el dashboard web público que muestra alertas de error de precio en tiempo real, con filtros por tienda y actualización automática via Supabase Realtime.

**Architecture:** SPA en React + Vite deployada en Vercel. Conecta directamente a Supabase via su SDK JS (sin backend propio). Supabase Realtime notifica al frontend cuando se insertan o actualizan alertas. Sin autenticación en MVP.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, @supabase/supabase-js 2.x, Vitest + Testing Library

---

## File Structure

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── lib/
    │   └── supabase.js            # Cliente Supabase
    ├── hooks/
    │   ├── useAlerts.js           # Fetch inicial + realtime subscription
    │   └── useStats.js            # Stats: total alertas, productos monitoreados
    ├── components/
    │   ├── StatsHeader.jsx        # Contadores globales
    │   ├── FilterBar.jsx          # Filtros: tienda, solo activas
    │   ├── AlertCard.jsx          # Card individual de alerta
    │   ├── AlertFeed.jsx          # Lista de AlertCards
    │   └── Badge.jsx              # Badge reutilizable (tienda, "Resuelto")
    └── utils/
        └── format.js              # Formatear precios, tiempos relativos
```

---

### Task 1: Setup Vite + React + Tailwind

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/.env.example`

- [ ] **Step 1: Inicializar proyecto**

```bash
cd /Users/feli24a/Desktop/Proyectos/pricerrors
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npm install @supabase/supabase-js
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 2: Configurar tailwind.config.js**

Reemplazar el contenido:
```javascript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff7ed",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Configurar vite.config.js para tests**

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 4: Crear test-setup.js**

```javascript
// frontend/src/test-setup.js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Actualizar package.json con script de test**

Agregar a `scripts`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Crear .env.example**

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 7: Verificar dev server**

```bash
cd frontend && npm run dev
```

Expected: Vite server corriendo en http://localhost:5173 sin errores.

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "chore: setup Vite + React + Tailwind + Vitest"
```

---

### Task 2: Supabase client + utilidades de formato

**Files:**
- Create: `frontend/src/lib/supabase.js`
- Create: `frontend/src/utils/format.js`
- Create: `frontend/src/utils/format.test.js`

- [ ] **Step 1: Escribir tests de format.js**

```javascript
// frontend/src/utils/format.test.js
import { describe, it, expect } from 'vitest'
import { formatPrice, formatDiscount, formatTimeActive } from './format'

describe('formatPrice', () => {
  it('formatea precios en colones con separadores de miles', () => {
    expect(formatPrice(299999)).toBe('₡299.999')
  })

  it('formatea precios pequeños correctamente', () => {
    expect(formatPrice(1000)).toBe('₡1.000')
  })
})

describe('formatDiscount', () => {
  it('retorna el porcentaje redondeado con signo', () => {
    expect(formatDiscount(70.12)).toBe('-70%')
  })

  it('redondea al entero más cercano', () => {
    expect(formatDiscount(65.9)).toBe('-66%')
  })
})

describe('formatTimeActive', () => {
  it('muestra minutos cuando lleva menos de una hora', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(formatTimeActive(tenMinutesAgo)).toBe('10 min')
  })

  it('muestra horas cuando lleva más de 60 minutos', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatTimeActive(twoHoursAgo)).toBe('2 h')
  })

  it('muestra "recién detectado" cuando lleva menos de 1 minuto', () => {
    const justNow = new Date(Date.now() - 30 * 1000).toISOString()
    expect(formatTimeActive(justNow)).toBe('recién detectado')
  })
})
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
cd frontend && npm run test:run
```
Expected: `Cannot find module './format'`

- [ ] **Step 3: Implementar format.js**

```javascript
// frontend/src/utils/format.js

/**
 * Formatea un precio en colones costarricenses.
 * @param {number} price
 * @returns {string} ej: "₡299.999"
 */
export function formatPrice(price) {
  return '₡' + Math.round(price).toLocaleString('es-CR').replace(/,/g, '.')
}

/**
 * Formatea el porcentaje de descuento.
 * @param {number} pct - ej: 70.12
 * @returns {string} ej: "-70%"
 */
export function formatDiscount(pct) {
  return `-${Math.round(pct)}%`
}

/**
 * Retorna tiempo relativo desde una fecha ISO.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatTimeActive(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'recién detectado'
  if (diffMin < 60) return `${diffMin} min`
  return `${Math.floor(diffMin / 60)} h`
}
```

- [ ] **Step 4: Ejecutar — deben pasar**

```bash
cd frontend && npm run test:run
```
Expected: `7 passed`

- [ ] **Step 5: Crear supabase.js**

```javascript
// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/ frontend/src/utils/ frontend/src/test-setup.js
git commit -m "feat: cliente Supabase + utilidades de formato (TDD)"
```

---

### Task 3: Badge component

**Files:**
- Create: `frontend/src/components/Badge.jsx`
- Create: `frontend/src/components/Badge.test.jsx`

- [ ] **Step 1: Escribir test**

```javascript
// frontend/src/components/Badge.test.jsx
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

it('renderiza el texto del badge', () => {
  render(<Badge>Walmart</Badge>)
  expect(screen.getByText('Walmart')).toBeInTheDocument()
})

it('aplica variante "resolved" con estilo correcto', () => {
  render(<Badge variant="resolved">Resuelto</Badge>)
  const badge = screen.getByText('Resuelto')
  expect(badge).toHaveClass('bg-gray-100')
})

it('aplica variante "active" por defecto', () => {
  render(<Badge>Activo</Badge>)
  const badge = screen.getByText('Activo')
  expect(badge).toHaveClass('bg-brand-50')
})
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
cd frontend && npm run test:run -- Badge
```
Expected: `Cannot find module './Badge'`

- [ ] **Step 3: Implementar Badge.jsx**

```jsx
// frontend/src/components/Badge.jsx

const variants = {
  active:   'bg-brand-50 text-brand-700 border border-brand-200',
  resolved: 'bg-gray-100 text-gray-500 border border-gray-200',
  store:    'bg-blue-50 text-blue-700 border border-blue-200',
}

export function Badge({ children, variant = 'active' }) {
  const cls = variants[variant] ?? variants.active
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 4: Ejecutar — debe pasar**

```bash
cd frontend && npm run test:run -- Badge
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Badge.jsx frontend/src/components/Badge.test.jsx
git commit -m "feat: Badge component (TDD)"
```

---

### Task 4: AlertCard component

**Files:**
- Create: `frontend/src/components/AlertCard.jsx`
- Create: `frontend/src/components/AlertCard.test.jsx`

- [ ] **Step 1: Escribir tests**

```javascript
// frontend/src/components/AlertCard.test.jsx
import { render, screen } from '@testing-library/react'
import { AlertCard } from './AlertCard'

const activeAlert = {
  id: 'alert-1',
  current_price: 30000,
  historical_avg: 100000,
  discount_pct: 70,
  detected_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  is_active: true,
  resolved_at: null,
  products: {
    name: 'Smart TV 55"',
    url: 'https://walmart.co.cr/tv-55',
    image_url: 'https://img.walmart.co.cr/tv.jpg',
    store: 'walmart',
  },
}

const resolvedAlert = { ...activeAlert, is_active: false, resolved_at: new Date().toISOString() }

it('muestra el nombre del producto', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('Smart TV 55"')).toBeInTheDocument()
})

it('muestra el precio actual formateado', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('₡30.000')).toBeInTheDocument()
})

it('muestra el precio histórico formateado', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('₡100.000')).toBeInTheDocument()
})

it('muestra el porcentaje de descuento', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('-70%')).toBeInTheDocument()
})

it('el link apunta a la tienda', () => {
  render(<AlertCard alert={activeAlert} />)
  const link = screen.getByRole('link')
  expect(link).toHaveAttribute('href', 'https://walmart.co.cr/tv-55')
})

it('muestra badge "Resuelto" cuando is_active es false', () => {
  render(<AlertCard alert={resolvedAlert} />)
  expect(screen.getByText('Resuelto')).toBeInTheDocument()
})

it('no muestra badge "Resuelto" cuando is_active es true', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.queryByText('Resuelto')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
cd frontend && npm run test:run -- AlertCard
```
Expected: `Cannot find module './AlertCard'`

- [ ] **Step 3: Implementar AlertCard.jsx**

```jsx
// frontend/src/components/AlertCard.jsx
import { Badge } from './Badge'
import { formatPrice, formatDiscount, formatTimeActive } from '../utils/format'

export function AlertCard({ alert }) {
  const { products: p, current_price, historical_avg, discount_pct, detected_at, is_active } = alert

  return (
    <article className={`bg-white rounded-xl border shadow-sm overflow-hidden flex gap-4 p-4 transition-opacity ${!is_active ? 'opacity-60' : ''}`}>
      {/* Imagen */}
      {p.image_url && (
        <img
          src={p.image_url}
          alt={p.name}
          className="w-24 h-24 object-contain shrink-0 rounded-lg bg-gray-50"
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-900 hover:text-brand-600 line-clamp-2 text-sm leading-tight"
          >
            {p.name}
          </a>
          <span className="text-2xl font-bold text-brand-600 shrink-0">
            {formatDiscount(discount_pct)}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900">{formatPrice(current_price)}</span>
          <span className="text-sm text-gray-400 line-through">{formatPrice(historical_avg)}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="store">{p.store}</Badge>
          {!is_active && <Badge variant="resolved">Resuelto</Badge>}
          <span className="text-xs text-gray-400">hace {formatTimeActive(detected_at)}</span>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Ejecutar — deben pasar**

```bash
cd frontend && npm run test:run -- AlertCard
```
Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AlertCard.jsx frontend/src/components/AlertCard.test.jsx
git commit -m "feat: AlertCard component con precio, descuento y estado (TDD)"
```

---

### Task 5: FilterBar component

**Files:**
- Create: `frontend/src/components/FilterBar.jsx`
- Create: `frontend/src/components/FilterBar.test.jsx`

- [ ] **Step 1: Escribir tests**

```javascript
// frontend/src/components/FilterBar.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'

const defaultFilters = { store: 'all', onlyActive: true }

it('muestra botones de tienda: Todas, Walmart, Gollo, Monge', () => {
  render(<FilterBar filters={defaultFilters} onChange={() => {}} />)
  expect(screen.getByRole('button', { name: /todas/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /walmart/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /gollo/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /monge/i })).toBeInTheDocument()
})

it('llama onChange con el store correcto al hacer clic', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<FilterBar filters={defaultFilters} onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: /walmart/i }))
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, store: 'walmart' })
})

it('muestra el toggle "Solo activas"', () => {
  render(<FilterBar filters={defaultFilters} onChange={() => {}} />)
  expect(screen.getByRole('checkbox', { name: /solo activas/i })).toBeInTheDocument()
})

it('llama onChange al cambiar el toggle', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<FilterBar filters={defaultFilters} onChange={onChange} />)
  await user.click(screen.getByRole('checkbox', { name: /solo activas/i }))
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, onlyActive: false })
})
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
cd frontend && npm run test:run -- FilterBar
```

- [ ] **Step 3: Implementar FilterBar.jsx**

```jsx
// frontend/src/components/FilterBar.jsx

const STORES = [
  { id: 'all', label: 'Todas' },
  { id: 'walmart', label: 'Walmart' },
  { id: 'gollo', label: 'Gollo' },
  { id: 'monge', label: 'Monge' },
]

export function FilterBar({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro por tienda */}
      <div className="flex gap-1">
        {STORES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange({ ...filters, store: id })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.store === id
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toggle solo activas */}
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          aria-label="Solo activas"
          checked={filters.onlyActive}
          onChange={(e) => onChange({ ...filters, onlyActive: e.target.checked })}
          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        Solo activas
      </label>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar — deben pasar**

```bash
cd frontend && npm run test:run -- FilterBar
```
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterBar.jsx frontend/src/components/FilterBar.test.jsx
git commit -m "feat: FilterBar component (TDD)"
```

---

### Task 6: StatsHeader component

**Files:**
- Create: `frontend/src/components/StatsHeader.jsx`
- Create: `frontend/src/components/StatsHeader.test.jsx`

- [ ] **Step 1: Escribir tests**

```javascript
// frontend/src/components/StatsHeader.test.jsx
import { render, screen } from '@testing-library/react'
import { StatsHeader } from './StatsHeader'

it('muestra el total de alertas activas', () => {
  render(<StatsHeader activeCount={5} totalCount={120} storeCount={3} />)
  expect(screen.getByText('5')).toBeInTheDocument()
})

it('muestra el total histórico de alertas', () => {
  render(<StatsHeader activeCount={5} totalCount={120} storeCount={3} />)
  expect(screen.getByText('120')).toBeInTheDocument()
})

it('muestra el número de tiendas monitoreadas', () => {
  render(<StatsHeader activeCount={5} totalCount={120} storeCount={3} />)
  expect(screen.getByText('3')).toBeInTheDocument()
})
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
cd frontend && npm run test:run -- StatsHeader
```

- [ ] **Step 3: Implementar StatsHeader.jsx**

```jsx
// frontend/src/components/StatsHeader.jsx

function StatCard({ value, label }) {
  return (
    <div className="bg-white rounded-xl border p-4 text-center">
      <div className="text-3xl font-bold text-brand-600">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

export function StatsHeader({ activeCount, totalCount, storeCount }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard value={activeCount} label="Errores activos" />
      <StatCard value={totalCount} label="Detectados históricamente" />
      <StatCard value={storeCount} label="Tiendas monitoreadas" />
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar — deben pasar**

```bash
cd frontend && npm run test:run -- StatsHeader
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StatsHeader.jsx frontend/src/components/StatsHeader.test.jsx
git commit -m "feat: StatsHeader component (TDD)"
```

---

### Task 7: Hooks (useAlerts + useStats)

**Files:**
- Create: `frontend/src/hooks/useAlerts.js`
- Create: `frontend/src/hooks/useStats.js`

> Los hooks usan Supabase directamente. Se testean con mocks del cliente.

- [ ] **Step 1: Implementar useAlerts.js**

```javascript
// frontend/src/hooks/useAlerts.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ALERTS_QUERY = `
  id,
  current_price,
  historical_avg,
  discount_pct,
  detected_at,
  resolved_at,
  is_active,
  products (
    name,
    url,
    image_url,
    store
  )
`

export function useAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Carga inicial
    async function fetchAlerts() {
      const { data, error } = await supabase
        .from('alerts')
        .select(ALERTS_QUERY)
        .order('detected_at', { ascending: false })
        .limit(100)

      if (error) {
        setError(error.message)
      } else {
        setAlerts(data)
      }
      setLoading(false)
    }

    fetchAlerts()

    // Suscripción realtime
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          // Re-fetch completo para obtener el join con products
          fetchAlerts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { alerts, loading, error }
}
```

- [ ] **Step 2: Implementar useStats.js**

```javascript
// frontend/src/hooks/useStats.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStats() {
  const [stats, setStats] = useState({ activeCount: 0, totalCount: 0, storeCount: 0 })

  useEffect(() => {
    async function fetchStats() {
      const [active, total, stores] = await Promise.all([
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('alerts').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('store', { count: 'exact' }),
      ])

      const storeCount = new Set((stores.data || []).map((r) => r.store)).size

      setStats({
        activeCount: active.count ?? 0,
        totalCount: total.count ?? 0,
        storeCount,
      })
    }

    fetchStats()
  }, [])

  return stats
}
```

- [ ] **Step 3: Verificar que no hay errores de linting**

```bash
cd frontend && npm run build 2>&1 | head -30
```
Expected: build exitoso sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: hooks useAlerts (con realtime) y useStats"
```

---

### Task 8: AlertFeed + App.jsx + estilos globales

**Files:**
- Create: `frontend/src/components/AlertFeed.jsx`
- Create: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/index.html`

- [ ] **Step 1: Implementar AlertFeed.jsx**

```jsx
// frontend/src/components/AlertFeed.jsx
import { AlertCard } from './AlertCard'

export function AlertFeed({ alerts, loading, error }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-500">
        Error cargando alertas: {error}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No hay errores de precio detectados aún.</p>
        <p className="text-sm mt-1">El sistema revisa las tiendas cada 10 minutos.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Implementar App.jsx**

```jsx
// frontend/src/App.jsx
import { useState, useMemo } from 'react'
import { useAlerts } from './hooks/useAlerts'
import { useStats } from './hooks/useStats'
import { StatsHeader } from './components/StatsHeader'
import { FilterBar } from './components/FilterBar'
import { AlertFeed } from './components/AlertFeed'

export default function App() {
  const { alerts, loading, error } = useAlerts()
  const stats = useStats()
  const [filters, setFilters] = useState({ store: 'all', onlyActive: true })

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filters.onlyActive && !a.is_active) return false
      if (filters.store !== 'all' && a.products?.store !== filters.store) return false
      return true
    })
  }, [alerts, filters])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ErrorDeals CR 🇨🇷</h1>
            <p className="text-xs text-gray-400">Errores de precio en tiendas de Costa Rica</p>
          </div>
          <span className="text-xs text-gray-400">Actualizado en tiempo real</span>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        <StatsHeader
          activeCount={stats.activeCount}
          totalCount={stats.totalCount}
          storeCount={stats.storeCount}
        />

        <FilterBar filters={filters} onChange={setFilters} />

        <AlertFeed alerts={filteredAlerts} loading={loading} error={error} />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar main.jsx**

```jsx
// frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 4: Actualizar index.css con Tailwind**

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Actualizar index.html**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ErrorDeals CR – Errores de precio en Costa Rica</title>
    <meta name="description" content="Detectamos errores de precio en Walmart CR, Gollo y Monge en tiempo real." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Verificar en el navegador**

```bash
cd frontend
cp .env.example .env
# Editar .env con los valores reales de Supabase
npm run dev
```

Abrir http://localhost:5173 y verificar:
- Carga el dashboard sin errores en consola
- StatsHeader muestra los contadores
- FilterBar es clickeable
- Si hay alertas en Supabase, aparecen en el feed

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: dashboard completo (AlertFeed, App, filtros, realtime)"
```

---

### Task 9: Deploy en Vercel

**Files:**
- Create: `frontend/vercel.json`

- [ ] **Step 1: Crear vercel.json**

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

- [ ] **Step 2: Deploy**

```bash
cd /Users/feli24a/Desktop/Proyectos/pricerrors/frontend
npx vercel --prod
```

Cuando pida:
- Root directory: `frontend`
- Framework: Vite

Agregar las variables de entorno en el dashboard de Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

- [ ] **Step 3: Verificar deploy**

Abrir la URL de Vercel y confirmar que el dashboard carga correctamente.

- [ ] **Step 4: Commit**

```bash
git add frontend/vercel.json
git commit -m "chore: config deploy Vercel para frontend"
```

---

## Self-Review

### Cobertura del PRD

| User Story | Task que lo implementa |
|---|---|
| US-1: Ver lista de errores detectados hoy | Task 7 (useAlerts), Task 8 (AlertFeed) |
| US-2: Ver precio actual e histórico | Task 4 (AlertCard) |
| US-3: Click directo al producto | Task 4 (AlertCard - link) |
| US-4: Ver tiempo activo del error | Task 2 (formatTimeActive), Task 4 |
| US-5: Filtrar por tienda | Task 5 (FilterBar), Task 8 (App.jsx) |
| US-6: Ver imagen del producto | Task 4 (AlertCard) |
| US-7: Ver % de descuento | Task 4 (AlertCard - formatDiscount) |
| US-8: Dashboard actualiza sin recargar | Task 7 (useAlerts - Supabase Realtime) |
| US-9: Ver contadores históricos | Task 6 (StatsHeader), Task 7 (useStats) |
| US-10: Ver error ya corregido | Task 4 (badge "Resuelto"), Task 5 (toggle "Solo activas") |
