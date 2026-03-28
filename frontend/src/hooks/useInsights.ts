import { useState, useCallback } from 'react'
import type { ProjectInsights } from '../types'
import { useWebSocketConnection } from './useWebSocketConnection'

interface UseInsightsResult {
  insights: ProjectInsights | null
  loading: boolean
  error: string | null
}

export function useInsights(sessionId: string): UseInsightsResult {
  const [insights, setInsights] = useState<ProjectInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onMessage = useCallback((data: ProjectInsights & { error?: string }) => {
    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }
    setInsights(data)
    setError(null)
    setLoading(false)
  }, [])

  useWebSocketConnection<ProjectInsights & { error?: string }>(
    `/ws/insights/${sessionId}`,
    { onMessage },
  )

  return { insights, loading, error }
}
