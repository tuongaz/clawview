import { useState, useEffect, useRef, useCallback } from 'react'
import type { MemoryFile } from '../types'

interface UseMemoryFilesResult {
  files: MemoryFile[]
  loading: boolean
  error: string | null
}

export function useMemoryFiles(sessionId: string): UseMemoryFilesResult {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws/sessions/${sessionId}/memory`)
    wsRef.current = ws

    ws.onopen = () => {
      backoffRef.current = 1000
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as MemoryFile[]
        setFiles(data)
        setError(null)
        setLoading(false)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (!mountedRef.current) return
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, 10000)
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [sessionId])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return { files, loading, error }
}
