import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL

export function useRealtimeReports(hours = 24) {
  const [reports, setReports] = useState([])
  const [stats,   setStats]   = useState({
    reports_24h: 0, rescue_needed: 0, critical_active: 0, resolved_24h: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${API}/reports/?hours=${hours}&limit=200`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      setReports(await res.json())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [hours])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/reports/stats`)
      if (!res.ok) return
      setStats(await res.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchReports()
    fetchStats()

    const channel = supabase
      .channel('flood_reports_live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'flood_reports' },
        (payload) => {
          setReports(prev => [payload.new, ...prev])
          // Optimistically bump reports_24h
          setStats(prev => ({ ...prev, reports_24h: prev.reports_24h + 1 }))
          fetchStats()   // then confirm from server
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'flood_reports' },
        (payload) => {
          setReports(prev =>
            prev.map(r => r.id === payload.new.id ? payload.new : r)
          )
          fetchStats()   // UPDATE events (resolve/verify) always refresh stats
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchReports, fetchStats])

  const resolveReport = async (id) => {
    // 1. Optimistic: immediately remove from active list + update stats in UI
    setReports(prev => prev.filter(r => r.id !== id))
    setStats(prev => ({
      ...prev,
      resolved_24h:    prev.resolved_24h + 1,
      rescue_needed:   Math.max(0, prev.rescue_needed - 1),   // may not apply but safe
      critical_active: Math.max(0, prev.critical_active - 1), // may not apply but safe
    }))

    // 2. Persist to backend
    await fetch(`${API}/reports/${id}/resolve`, { method: 'PATCH' })

    // 3. Confirm real numbers from server (corrects the optimistic guesses above)
    fetchStats()
  }

  const verifyReport = async (id) => {
    // Optimistic: flip verified flag immediately
    setReports(prev =>
      prev.map(r => r.id === id ? { ...r, verified: true } : r)
    )
    await fetch(`${API}/reports/${id}/verify`, { method: 'PATCH' })
  }

  return { reports, stats, loading, error, resolveReport, verifyReport, refetch: fetchReports }
}
