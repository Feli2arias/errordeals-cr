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

    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchAlerts()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { alerts, loading, error }
}
