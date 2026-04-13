import { Badge } from './Badge'
import { formatPrice, formatTimeActive } from '../utils/format'

const STORE_LABELS = { walmart: 'Walmart CR', gollo: 'Gollo', monge: 'Monge' }

export function DiscountCard({ discount }) {
  const { name, url, store, image_url, current_price, original_price, discount_pct, scraped_at } = discount

  return (
    <article className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
      {image_url && (
        <img
          src={image_url}
          alt={name}
          className="w-20 h-20 object-contain rounded-lg flex-shrink-0 bg-gray-50"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 leading-snug"
          >
            {name}
          </a>
          <Badge variant="discount" className="flex-shrink-0">-{discount_pct}%</Badge>
        </div>

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-lg font-bold text-gray-900">{formatPrice(current_price)}</span>
          <span className="text-sm text-gray-400 line-through">{formatPrice(original_price)}</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="store">{STORE_LABELS[store] || store}</Badge>
          <span className="text-xs text-gray-400">{formatTimeActive(scraped_at)}</span>
        </div>
      </div>
    </article>
  )
}
