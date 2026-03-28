import { useMemo, Suspense, lazy } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Spinner } from '@heroui/react'
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
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>}>
            <InsightsPanel sessionId={sessionId} />
          </Suspense>
        ) : (
          <EmptyState message="Project not found or no sessions available." className="py-20" />
        )}
      </div>
    </div>
  )
}
