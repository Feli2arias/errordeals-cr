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
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ErrorDeals CR 🇨🇷</h1>
            <p className="text-xs text-gray-400">Errores de precio en tiendas de Costa Rica</p>
          </div>
          <span className="text-xs text-gray-400">Actualizado en tiempo real</span>
        </div>
      </header>

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
