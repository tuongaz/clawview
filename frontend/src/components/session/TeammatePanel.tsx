import { Skeleton } from '@heroui/react'
import { useSessionDetail } from '../../hooks/useSessionDetail'
import { SessionContent } from './SessionContent'

interface TeammatePanelProps {
  sessionId: string
}

export function TeammatePanel({ sessionId }: TeammatePanelProps) {
  const { detail, loading } = useSessionDetail(sessionId)

  if (loading || !detail) {
    return (
      <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)] p-4 animate-pulse space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="w-32 h-5 rounded" />
          <Skeleton className="w-16 h-4 rounded-full ml-auto" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-24 h-3 rounded" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const displayName = detail.agentName || detail.name || detail.sessionId.slice(0, 8)

  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)] p-4">
      <SessionContent detail={detail} label={displayName} showSidebar={false} />
    </div>
  )
}
