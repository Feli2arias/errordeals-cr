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
