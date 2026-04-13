import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStats() {
  const [stats, setStats] = useState({ activeCount: 0, totalCount: 0, storeCount: 0 })

  useEffect(() => {
    async function fetchStats() {
      const [active, total, stores] = await Promise.all([
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('alerts').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('store'),
      ])

      const storeCount = new Set((stores.data || []).map((r) => r.store)).size

      setStats({
        activeCount: active.count ?? 0,
        totalCount: total.count ?? 0,
        storeCount,
      })
    }

    fetchStats()
  }, [])

  return stats
}
