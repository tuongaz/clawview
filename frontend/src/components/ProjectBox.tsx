import { useState } from 'react'
import { Card, Button } from '@heroui/react'
import { useNavigate } from 'react-router-dom'
import type { ProjectGroup } from '../types'
import { SessionCard } from './SessionCard'
import { StatusIndicator } from './StatusIndicator'

interface ProjectBoxProps {
  group: ProjectGroup
  displayName: string
}

export function ProjectBox({ group, displayName }: ProjectBoxProps) {
  const name = displayName
  const navigate = useNavigate()

  const activeSessions = group.sessions.filter((s) => s.isActive)
  const idleSessions = group.sessions.filter((s) => !s.isActive)
  const hasActive = activeSessions.length > 0
  const hasIdle = idleSessions.length > 0
  const hasWorking = activeSessions.some((s) => !s.waitingForInput)
  const projectIsWaiting = hasActive && !hasWorking

  const [filter, setFilter] = useState<'recent' | 'all' | 'active'>('recent')

  const sortedSessions = [...activeSessions, ...idleSessions]
  const visibleSessions = filter === 'all'
    ? sortedSessions
    : filter === 'active'
      ? activeSessions
      : sortedSessions.slice(0, 10)

  const cycleFilter = () => {
    setFilter(f => f === 'recent' ? 'all' : f === 'all' ? 'active' : 'recent')
  }
  const buttonLabel = filter === 'recent' ? 'Show All' : filter === 'all' ? 'Show Active' : 'Show Recent'
  const showFilterButton = group.sessions.length > 10 || (hasActive && hasIdle)

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <Card.Header className="flex-col gap-0 p-0">
        <div className="flex items-center gap-3 w-full bg-[var(--bg-secondary)] rounded-lg px-4 py-3">
          <StatusIndicator isActive={hasActive} isWaiting={projectIsWaiting} size={8} />
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-xl font-bold text-[var(--text-bright)] whitespace-nowrap">
              {name}
            </span>
            <span className="font-mono text-sm text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
              {group.path}
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto shrink-0">
            <span className="font-mono text-sm text-[var(--text-secondary)] whitespace-nowrap">
              {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
              {hasActive && ` · ${activeSessions.length} active`}
            </span>
            {showFilterButton && (
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-base text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)]"
                onPress={cycleFilter}
              >
                {buttonLabel}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-base text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30 hover:bg-[var(--accent-cyan)]/10 hover:border-[var(--accent-cyan)]"
              onPress={() => navigate(`/insights/${encodeURIComponent(group.projectName)}`)}
            >
              View Project
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Content className="p-0 pt-3 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 items-stretch">
          {visibleSessions.map((session) => (
            <SessionCard key={session.sessionId} session={session} projectPath={group.path} />
          ))}
        </div>
      </Card.Content>
    </Card>
  )
}
