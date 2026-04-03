import { useState, useCallback } from 'react'
import { Card, Button } from '@heroui/react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { ProjectGroup, Session } from '../types'
import { SessionCard } from './SessionCard'
import { StatusIndicator } from './StatusIndicator'

interface ProjectBoxProps {
  group: ProjectGroup
  displayName: string
}

export function ProjectBox({ group, displayName }: ProjectBoxProps) {
  const name = displayName
  const navigate = useNavigate()
  const [extraSessions, setExtraSessions] = useState<Session[]>([])
  const [loadingMore, setLoadingMore] = useState(false)

  // Merge WS sessions with any extra loaded via REST
  const allSessions = (() => {
    if (extraSessions.length === 0) return group.sessions
    const wsIds = new Set(group.sessions.map(s => s.sessionId))
    const extras = extraSessions.filter(s => !wsIds.has(s.sessionId))
    return [...group.sessions, ...extras]
  })()

  const activeSessions = allSessions.filter((s) => s.isActive)
  const idleSessions = allSessions.filter((s) => !s.isActive)
  const hasActive = activeSessions.length > 0
  const hasWorking = activeSessions.some((s) => !s.waitingForInput)
  const projectIsWaiting = hasActive && !hasWorking

  const totalOnServer = group.totalSessions || group.sessions.length
  const hasMore = allSessions.length < totalOnServer

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const offset = allSessions.length
      const res = await fetch(
        `/api/projects/${encodeURIComponent(group.projectName)}/sessions?offset=${offset}&limit=20`
      )
      if (res.ok) {
        const data = await res.json()
        setExtraSessions(prev => [...prev, ...data.sessions])
      }
    } finally {
      setLoadingMore(false)
    }
  }, [allSessions.length, group.projectName])

  const sortedSessions = [...activeSessions, ...idleSessions]

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
              {totalOnServer} session{totalOnServer !== 1 ? 's' : ''}
              {hasActive && ` · ${activeSessions.length} active`}
            </span>
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
          {sortedSessions.map((session) => (
            <SessionCard key={session.sessionId} session={session} projectPath={group.path} />
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="sm"
              isDisabled={loadingMore}
              className="font-mono text-sm text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)]"
              onPress={loadMore}
            >
              {loadingMore ? (
                'Loading...'
              ) : (
                <>
                  <ChevronDown size={14} />
                  Load more ({totalOnServer - allSessions.length} remaining)
                </>
              )}
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  )
}
