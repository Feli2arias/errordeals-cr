const STORES = [
  { id: 'all', label: 'Todas' },
  { id: 'walmart', label: 'Walmart' },
  { id: 'gollo', label: 'Gollo' },
  { id: 'monge', label: 'Monge' },
]

export function FilterBar({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
