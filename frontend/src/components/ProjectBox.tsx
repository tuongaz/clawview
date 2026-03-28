import { useState } from 'react'
import { Card, Button } from '@heroui/react'
import type { ProjectGroup } from '../types'
import { SessionCard } from './SessionCard'
import { StatusIndicator } from './StatusIndicator'

interface ProjectBoxProps {
  group: ProjectGroup
  displayName: string
}

export function ProjectBox({ group, displayName }: ProjectBoxProps) {
  const name = displayName

  const activeSessions = group.sessions.filter((s) => s.isActive)
  const idleSessions = group.sessions.filter((s) => !s.isActive)
  const hasIdle = idleSessions.length > 0
  const hasActive = activeSessions.length > 0

  const [expanded, setExpanded] = useState(false)

  const defaultSessions = hasActive ? activeSessions : idleSessions.slice(0, 4)
  const visibleSessions = expanded ? group.sessions : defaultSessions
  const hiddenCount = group.sessions.length - defaultSessions.length

  return (
    <Card className="bg-transparent border-0 shadow-none p-5">
      <Card.Header className="flex-row items-center gap-3 p-0 pb-1">
        <StatusIndicator isActive={hasActive} isWaiting={false} size={8} />
        <span className="font-mono text-lg font-bold text-[var(--text-bright)] whitespace-nowrap">
          {name}
        </span>
        <span className="font-mono text-[13px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
          {group.path}
        </span>
        <span className="font-mono text-[13px] text-[var(--text-secondary)] ml-auto whitespace-nowrap shrink-0">
          {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
          {hasActive && ` · ${activeSessions.length} active`}
        </span>
      </Card.Header>

      <Card.Content className="p-0 pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 items-stretch">
          {visibleSessions.map((session) => (
            <SessionCard key={session.sessionId} session={session} projectPath={group.path} />
          ))}
          {!expanded && hiddenCount > 0 && (
            <div className="col-span-full flex justify-center py-1">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)]"
                onPress={() => setExpanded(true)}
              >
                Show {hiddenCount} more session{hiddenCount !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
          {expanded && hasIdle && hasActive && (
            <div className="col-span-full flex justify-center py-1">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)]"
                onPress={() => setExpanded(false)}
              >
                Show less
              </Button>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}
