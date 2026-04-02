import { useState, useMemo, Suspense, lazy } from 'react'
import { useParams } from 'react-router-dom'
import { Skeleton, Button } from '@heroui/react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Header } from '../components/Header'
import { EmptyState } from '../components/ui'
import { SessionCard } from '../components/SessionCard'

const InsightsPanel = lazy(() =>
  import('../components/insights/InsightsPanel').then(m => ({ default: m.InsightsPanel }))
)

function ProjectPageSkeleton() {
  return (
    <>
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {['sessions', 'insights'].map((tab) => (
          <div key={tab} className="px-4 py-2 -mb-px border-b-2 border-transparent">
            <Skeleton className="w-16 h-4 rounded" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-24 h-4 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius)] shadow-md shadow-black/20 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="w-20 h-3 rounded" />
              <Skeleton className="ml-auto w-12 h-3 rounded" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-full h-3 rounded" />
              <Skeleton className="w-3/4 h-3 rounded" />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-light)]">
              <Skeleton className="w-16 h-4 rounded" />
              <div className="flex-1" />
              <Skeleton className="w-10 h-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function ProjectInsightsPage() {
  const { projectId } = useParams()
  const projectName = projectId ? decodeURIComponent(projectId) : ''
  const { groups, loading } = useWebSocket()

  const group = useMemo(
    () => groups.find(g => g.projectName === projectName),
    [groups, projectName]
  )

  const sessionId = group?.sessions[0]?.sessionId ?? null

  const [activeTab, setActiveTab] = useState<'sessions' | 'insights'>('sessions')
  const [filter, setFilter] = useState<'recent' | 'all' | 'active'>('recent')

  const activeSessions = group?.sessions.filter(s => s.isActive) ?? []
  const idleSessions = group?.sessions.filter(s => !s.isActive) ?? []
  const hasActive = activeSessions.length > 0
  const hasIdle = idleSessions.length > 0
  const sortedSessions = [...activeSessions, ...idleSessions]
  const filteredSessions = useMemo(() => {
    if (!group) return []
    if (filter === 'all') return sortedSessions
    if (filter === 'active') return activeSessions
    return sortedSessions.slice(0, 10)
  }, [group, filter, sortedSessions, activeSessions])

  const cycleFilter = () => {
    setFilter(f => f === 'recent' ? 'all' : f === 'all' ? 'active' : 'recent')
  }
  const buttonLabel = filter === 'recent' ? 'Show All' : filter === 'all' ? 'Show Active' : 'Show Recent'
  const showFilterButton = (group?.sessions.length ?? 0) > 10 || (hasActive && hasIdle)

  const displayName = useMemo(() => {
    if (!group) return projectName
    const parts = group.projectName.split('/')
    return parts.pop() || group.projectName
  }, [group, projectName])

  return (
    <div className="w-full min-h-screen">
      <Header />

      <div className="px-8 py-6 max-sm:px-4 max-sm:py-4">
        <div className="mb-6">
          <h1 className="font-mono text-xl font-bold text-[var(--text-bright)]">{displayName}</h1>
          <span className="font-mono text-sm text-[var(--text-secondary)]">{group?.path ?? projectName}</span>
        </div>

        {loading ? (
          <ProjectPageSkeleton />
        ) : group ? (
          <>
            <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
              {(['sessions', 'insights'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`font-mono text-base px-4 py-2 -mb-px border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'border-[var(--accent-cyan)] text-[var(--text-bright)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'sessions' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm text-[var(--text-secondary)]">
                    {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {filteredSessions.map((session) => (
                    <SessionCard key={session.sessionId} session={session} projectPath={group.path} />
                  ))}
                </div>
                {filteredSessions.length === 0 && (
                  <EmptyState message={filter === 'active' ? 'No active sessions.' : 'No sessions for this project.'} className="py-12" />
                )}
              </div>
            )}

            {activeTab === 'insights' && (
              <>
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
              </>
            )}
          </>
        ) : (
          <EmptyState message="Project not found or no sessions available." className="py-20" />
        )}
      </div>
    </div>
  )
}
