import { useEffect, useRef } from 'react'

interface UseWebSocketConnectionOptions<T> {
  onMessage: (data: T) => void
  onError?: (error: string) => void
  onOpen?: () => void
}

export function useWebSocketConnection<T>(
  path: string,
  options: UseWebSocketConnectionOptions<T>,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const optionsRef = useRef(options)
  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    connectRef.current = () => {
      if (!mountedRef.current) return

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${location.host}${path}`)
      wsRef.current = ws

      ws.onopen = () => {
        backoffRef.current = 1000
        optionsRef.current.onOpen?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T
          optionsRef.current.onMessage(data)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!mountedRef.current) return
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, 10000)
        reconnectTimerRef.current = setTimeout(() => connectRef.current(), delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    mountedRef.current = true
    connectRef.current()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [path])
}
