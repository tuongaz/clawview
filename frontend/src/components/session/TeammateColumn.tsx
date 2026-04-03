import { useState } from 'react'
import { User } from 'lucide-react'
import { useSessionDetail } from '../../hooks/useSessionDetail'
import { StatusIndicator } from '../StatusIndicator'
import { SessionContent } from './SessionContent'
import { Skeleton } from '@heroui/react'

function TeammateTab({ sessionId, isActive: isSelected }: { sessionId: string; isActive: boolean }) {
  const { detail, loading } = useSessionDetail(sessionId)

  if (!isSelected) return null

  if (loading || !detail) {
    return (
      <div className="p-4 animate-pulse space-y-3">
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

  return <SessionContent detail={detail} label={displayName} showSidebar={false} />
}

function TabLabel({ sessionId, isSelected, onClick }: { sessionId: string; isSelected: boolean; onClick: () => void }) {
  const { detail } = useSessionDetail(sessionId)
  const name = detail?.agentName || detail?.name || sessionId.slice(0, 8)
  const isActive = detail?.isActive ?? false
  const isWaiting = detail?.waitingForInput ?? false

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors cursor-pointer ${
        isSelected
          ? 'bg-[var(--bg-secondary)] text-[var(--text-bright)] border-[var(--border)]'
          : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-white/5'
      }`}
    >
      <User size={12} className="shrink-0" />
      <StatusIndicator isActive={isActive} isWaiting={isWaiting} size={6} />
      {name}
    </button>
  )
}

interface TeammateColumnProps {
  teammateSessionIds: string[]
}

export function TeammateColumn({ teammateSessionIds }: TeammateColumnProps) {
  const [activeIdx, setActiveIdx] = useState(0)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-end gap-0.5 -mb-px">
        {teammateSessionIds.map((sid, i) => (
          <TabLabel
            key={sid}
            sessionId={sid}
            isSelected={i === activeIdx}
            onClick={() => setActiveIdx(i)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div className="border border-[var(--border)] rounded-b-xl rounded-tr-xl bg-[var(--bg-secondary)] p-4">
        {teammateSessionIds.map((sid, i) => (
          <TeammateTab key={sid} sessionId={sid} isActive={i === activeIdx} />
        ))}
      </div>
    </div>
  )
}
