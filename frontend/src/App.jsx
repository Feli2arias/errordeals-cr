import { useState, useMemo } from 'react'
import { useAlerts } from './hooks/useAlerts'
import { useStats } from './hooks/useStats'
import { useDiscounts } from './hooks/useDiscounts'
import { StatsHeader } from './components/StatsHeader'
import { FilterBar } from './components/FilterBar'
import { AlertFeed } from './components/AlertFeed'
import { DiscountCard } from './components/DiscountCard'

const TABS = [
  { id: 'errores', label: 'Errores de precio' },
  { id: 'descuentos', label: 'Descuentos +50%' },
]

export default function App() {
  const { alerts, loading: alertsLoading, error: alertsError } = useAlerts()
  const { discounts, loading: discountsLoading } = useDiscounts()
  const stats = useStats()
  const [filters, setFilters] = useState({ store: 'all', onlyActive: true })
  const [activeTab, setActiveTab] = useState('errores')

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filters.onlyActive && !a.is_active) return false
      if (filters.store !== 'all' && a.products?.store !== filters.store) return false
      return true
    })
  }, [alerts, filters])

  const filteredDiscounts = useMemo(() => {
    if (filters.store === 'all') return discounts
    return discounts.filter((d) => d.store === filters.store)
  }, [discounts, filters.store])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ErrorDeals CR 🇨🇷</h1>
            <p className="text-xs text-gray-400">Ofertas y errores de precio en Costa Rica</p>
          </div>
          <span className="text-xs text-gray-400">Actualizado en tiempo real</span>
        </div>

        <div className="max-w-3xl mx-auto px-4 flex gap-1 border-t">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.id === 'descuentos' && discounts.length > 0 && (
                <span className="ml-1.5 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">
                  {discounts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        {activeTab === 'errores' && (
          <>
            <StatsHeader
              activeCount={stats.activeCount}
              totalCount={stats.totalCount}
              storeCount={stats.storeCount}
            />
            <FilterBar filters={filters} onChange={setFilters} />
            <AlertFeed alerts={filteredAlerts} loading={alertsLoading} error={alertsError} />
          </>
        )}

        {activeTab === 'descuentos' && (
          <>
            <FilterBar filters={filters} onChange={(f) => setFilters({ ...f, onlyActive: true })} />
            {discountsLoading ? (
              <p className="text-center text-gray-400 py-12 text-sm">Cargando descuentos...</p>
            ) : filteredDiscounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No hay descuentos mayores al 50% en este momento.</p>
                <p className="text-gray-300 text-xs mt-1">El scraper actualiza cada 10 minutos.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredDiscounts.map((d) => (
                  <DiscountCard key={d.product_id} discount={d} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
