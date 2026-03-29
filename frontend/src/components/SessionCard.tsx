import { memo } from 'react'
import { Card } from '@heroui/react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '../types'
import { timeAgo } from '../utils'
import { StatusIndicator, ActiveDot } from './StatusIndicator'
import { GitBranchBadge, MemoryBadge, ClientBadge, ContextMeter } from './metadata'

interface SessionCardProps {
  session: Session
  projectPath: string
}

export const SessionCard = memo(function SessionCard({ session, projectPath }: SessionCardProps) {
  const navigate = useNavigate()
  const slug = session.sessionId.slice(0, 8)
  const isActive = session.isActive
  const isWaiting = session.waitingForInput
  const hasFooter = session.gitBranch || session.usesMemory || session.client || session.contextTokens > 0

  const borderClass = isActive
    ? isWaiting
      ? 'border-warning'
      : 'border-success'
    : 'border-[var(--border)]'

  return (
    <Card
      className={`bg-[var(--bg-primary)] border ${borderClass} hover:bg-[var(--bg-card)] shadow-md shadow-black/20 cursor-pointer ${isActive ? 'bg-[var(--bg-card)]' : ''}`}
      onClick={() => navigate(`/session/${session.sessionId}`)}
    >
      <Card.Header className="flex-row items-center gap-2 px-4 pt-3 pb-0">
        <StatusIndicator isActive={isActive} isWaiting={isWaiting} size={7} />
        {session.name ? (
          <>
            <span className={`font-semibold text-base truncate max-w-[160px] ${isActive ? 'text-[var(--text-bright)]' : 'text-[var(--text-primary)]'}`}>
              {session.name}
            </span>
            <span className="text-[var(--text-secondary)] font-mono text-sm">
              {slug}
            </span>
          </>
        ) : (
          <span className={`font-mono font-semibold text-base tracking-wider ${isActive ? 'text-[var(--text-bright)]' : 'text-[var(--text-secondary)]'}`}>
            {slug}
          </span>
        )}
        <span className="ml-auto text-[var(--text-secondary)] text-sm font-mono">
          {timeAgo(session.timestamp)}
        </span>
      </Card.Header>

      <Card.Content className="flex flex-col gap-2.5 px-4 py-2">
        {session.lastUserPrompt && (
          <div className="text-[var(--text-primary)] text-base leading-[1.4] whitespace-pre-wrap break-words line-clamp-3">
            {session.lastUserPrompt.startsWith('/') ? (
              <><span className="text-sm opacity-60 mr-0.5">&#8984;</span> {session.lastUserPrompt}</>
            ) : (
              session.lastUserPrompt
            )}
          </div>
        )}

        {session.lastAction && (
          <div className="flex items-center gap-1.5 text-warning text-sm font-mono bg-warning/[0.08] py-1 px-2.5 rounded-[var(--radius-sm)] line-clamp-2 break-words">
            {isActive && !isWaiting ? (
              <ActiveDot />
            ) : (
              <span className="text-sm shrink-0">&#9889;</span>
            )}
            {session.lastAction}
          </div>
        )}
      </Card.Content>

      {hasFooter && (
        <Card.Footer className="flex items-center gap-2 px-4 pt-3 pb-3 border-t border-[var(--border-light)] mt-auto">
          {session.gitBranch && <GitBranchBadge branch={session.gitBranch} />}
          {session.usesMemory && <MemoryBadge />}
          {session.client && <ClientBadge client={session.client} projectPath={projectPath} />}
          <div className="flex-1" />
          {session.contextTokens > 0 && (
            <ContextMeter contextTokens={session.contextTokens} maxContextTokens={session.maxContextTokens} />
          )}
        </Card.Footer>
      )}
    </Card>
  )
})
