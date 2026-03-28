import { useMemo, Suspense, lazy } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Skeleton } from '@heroui/react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Header } from '../components/Header'
import { EmptyState } from '../components/ui'

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

  const displayName = useMemo(() => {
    if (!group) return projectName
    const parts = group.projectName.split('/')
    return parts.pop() || group.projectName
  }, [group, projectName])

  return (
    <div className="w-full min-h-screen">
      <Header>
        <Link
          to="/"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </Header>

      <div className="px-8 py-6 max-sm:px-4 max-sm:py-4 max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="font-mono text-xl font-bold text-[var(--text-bright)]">{displayName}</h1>
          <span className="font-mono text-[12px] text-[var(--text-secondary)]">{group?.path ?? projectName}</span>
        </div>

        {sessionId ? (
          <Suspense fallback={
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 flex flex-col gap-2">
                    <Skeleton className="w-20 h-3 rounded" />
                    <Skeleton className="w-16 h-6 rounded" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-3">
                    <Skeleton className="w-32 h-4 rounded" />
                    <Skeleton className="w-full h-48 rounded" />
                  </div>
                ))}
              </div>
            </div>
          }>
            <InsightsPanel sessionId={sessionId} />
          </Suspense>
        ) : (
          <EmptyState message="Project not found or no sessions available." className="py-20" />
        )}
      </div>
    </div>
  )
}
