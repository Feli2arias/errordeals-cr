/**
 * Formatea un precio en colones costarricenses.
 * @param {number} price
 * @returns {string} ej: "₡299.999"
 */
export function formatPrice(price) {
  // Usar 'es' con maximumFractionDigits 0 y reemplazar separadores para garantizar
  // formato ₡299.999 independiente del entorno (jsdom, node, browser)
  const formatted = Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return '₡' + formatted
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
