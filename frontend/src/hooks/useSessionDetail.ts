import { useState, useEffect, useRef, useCallback } from 'react'
import type { SessionDetail } from '../types'

interface UseSessionDetailResult {
  detail: SessionDetail | null
  loading: boolean
  error: string | null
}

export function useSessionDetail(sessionId: string): UseSessionDetailResult {
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchDetail = useCallback(async (isInitial: boolean) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (isInitial) setLoading(true)

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail ?? `Failed to load session (${res.status})`)
      }
      const data: SessionDetail = await res.json()
      setDetail(data)
      setError(null)
      return data
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (isInitial) setError(message)
      return null
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const data = await fetchDetail(true)
      if (!mounted) return

      // Start polling if session is active
      if (data?.isActive) {
        intervalRef.current = setInterval(async () => {
          const updated = await fetchDetail(false)
          // Stop polling if session became inactive
          if (updated && !updated.isActive && intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }, 3000)
      }
    }

    init()

    return () => {
      mounted = false
      abortRef.current?.abort()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchDetail])

  return { detail, loading, error }
}
