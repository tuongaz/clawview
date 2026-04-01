import { useState, useMemo, Suspense, lazy } from 'react'
import { useParams } from 'react-router-dom'
import { Skeleton, Tabs, Button } from '@heroui/react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Header } from '../components/Header'
import { EmptyState } from '../components/ui'
import { SessionCard } from '../components/SessionCard'

const InsightsPanel = lazy(() =>
  import('../components/insights/InsightsPanel').then(m => ({ default: m.InsightsPanel }))
)

export function ProjectInsightsPage() {
  const { projectId } = useParams()
  const projectName = projectId ? decodeURIComponent(projectId) : ''
  const { groups } = useWebSocket()

  const group = useMemo(
    () => groups.find(g => g.projectName === projectName),
    [groups, projectName]
  )

  const sessionId = group?.sessions[0]?.sessionId ?? null

  const [showAll, setShowAll] = useState(true)

  const activeSessions = group?.sessions.filter(s => s.isActive) ?? []
  const hasActiveAndIdle = activeSessions.length > 0 && activeSessions.length < (group?.sessions.length ?? 0)
  const filteredSessions = useMemo(() => {
    if (!group) return []
    return showAll ? group.sessions : group.sessions.filter(s => s.isActive)
  }, [group, showAll])

  const displayName = useMemo(() => {
    if (!group) return projectName
    const parts = group.projectName.split('/')
    return parts.pop() || group.projectName
  }, [group, projectName])

  return (
    <div className="w-full min-h-screen">
      <Header />

      <div className="px-8 py-6 max-sm:px-4 max-sm:py-4 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="font-mono text-xl font-bold text-[var(--text-bright)]">{displayName}</h1>
          <span className="font-mono text-sm text-[var(--text-secondary)]">{group?.path ?? projectName}</span>
        </div>

        {group ? (
          <Tabs defaultSelectedKey="sessions" className="w-full">
            <Tabs.List className="gap-4 mb-4">
              <Tabs.Tab id="sessions" className="font-mono text-base">Sessions</Tabs.Tab>
              <Tabs.Tab id="insights" className="font-mono text-base">Insights</Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Panel id="sessions">
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm text-[var(--text-secondary)]">
                    {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
                  </span>
                  {hasActiveAndIdle && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-base text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)]"
                      onPress={() => setShowAll(!showAll)}
                    >
                      {showAll ? 'Show Active' : 'Show All'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {filteredSessions.map((session) => (
                    <SessionCard key={session.sessionId} session={session} projectPath={group.path} />
                  ))}
                </div>
                {filteredSessions.length === 0 && (
                  <EmptyState message={showAll ? 'No sessions for this project.' : 'No active sessions.'} className="py-12" />
                )}
              </div>
            </Tabs.Panel>

            <Tabs.Panel id="insights">
              {sessionId ? (
                <Suspense fallback={
                  <div className="mt-6 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-5 py-4 flex flex-col gap-2">
                          <Skeleton className="w-20 h-3 rounded" />
                          <Skeleton className="w-16 h-6 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 flex flex-col gap-3">
                          <Skeleton className="w-32 h-4 rounded" />
                          <Skeleton className="w-full h-56 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                }>
                  <InsightsPanel sessionId={sessionId} />
                </Suspense>
              ) : (
                <EmptyState message="No sessions available for insights." className="py-20" />
              )}
            </Tabs.Panel>
          </Tabs>
        ) : (
          <EmptyState message="Project not found or no sessions available." className="py-20" />
        )}
      </div>
    </div>
  )
}
