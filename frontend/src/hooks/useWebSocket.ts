import { useState, useEffect, useRef, useCallback } from 'react'
import type { ProjectGroup, TokenStats } from '../types'

interface UseWebSocketResult {
  groups: ProjectGroup[]
  stats: TokenStats | null
  connected: boolean
  lastUpdated: Date | null
}

export function useWebSocket(): UseWebSocketResult {
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      backoffRef.current = 1000 // reset backoff on successful connection
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { groups: ProjectGroup[]; stats: TokenStats }
        setGroups(data.groups)
        setStats(data.stats)
        setLastUpdated(new Date())
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      if (!mountedRef.current) return
      // schedule reconnect with exponential backoff
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, 10000)
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

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

  return { groups, stats, connected, lastUpdated }
}
