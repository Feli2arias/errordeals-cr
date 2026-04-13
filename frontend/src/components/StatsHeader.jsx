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
