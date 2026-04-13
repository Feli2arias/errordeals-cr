import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDiscounts() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchDiscounts() {
    const { data, error } = await supabase
      .from('discount_products')
      .select('*')
      .order('discount_pct', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setDiscounts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDiscounts()

    const channel = supabase
      .channel('discounts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'price_snapshots' }, fetchDiscounts)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return { discounts, loading, error }
}
