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
