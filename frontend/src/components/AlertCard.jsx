import { Badge } from './Badge'
import { formatPrice, formatDiscount, formatTimeActive } from '../utils/format'

export function AlertCard({ alert }) {
  const { products: p, current_price, historical_avg, discount_pct, detected_at, is_active } = alert

  return (
    <article className={`bg-white rounded-xl border shadow-sm overflow-hidden flex gap-4 p-4 transition-opacity ${!is_active ? 'opacity-60' : ''}`}>
      {p.image_url && (
        <img
          src={p.image_url}
          alt={p.name}
          className="w-24 h-24 object-contain shrink-0 rounded-lg bg-gray-50"
        />
      )}

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
