import { useState, useMemo, Suspense, lazy } from 'react'
import { Spinner } from '@heroui/react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Header } from '../components/Header'
import { EmptyState } from '../components/ui'

const InsightsPanel = lazy(() =>
  import('../components/insights/InsightsPanel').then(m => ({ default: m.InsightsPanel }))
)

export function InsightsPage() {
  const { groups } = useWebSocket()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Pick the first session ID for the selected project to feed the existing WS endpoint
  const sessionIdForProject = useMemo(() => {
    if (!selectedProject) return null
    const group = groups.find(g => g.projectName === selectedProject)
    return group?.sessions[0]?.sessionId ?? null
  }, [groups, selectedProject])

  // Build display labels, disambiguating duplicate folder names with parent
  const projectLabels = useMemo(() => {
    const shortNames = groups.map(g => g.projectName.split('/').pop() || g.projectName)
    const counts = new Map<string, number>()
    for (const name of shortNames) counts.set(name, (counts.get(name) || 0) + 1)
    return groups.map((g, i) => {
      const short = shortNames[i]
      if (counts.get(short)! > 1) {
        const parts = g.projectName.split('/')
        return parts.length >= 2 ? `${parts[parts.length - 2]}/${short}` : g.projectName
      }
      return short
    })
  }, [groups])

  // Auto-select first project when groups load
  if (!selectedProject && groups.length > 0) {
    setSelectedProject(groups[0].projectName)
  }

  return (
    <div className="w-full min-h-screen">
      <Header />

      <div className="px-8 py-6 max-sm:px-4 max-sm:py-4 max-w-[1400px] mx-auto">
        {/* Project Picker */}
        {groups.length > 1 && (
          <div className="mb-6 flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">Project</span>
            <select
              value={selectedProject ?? ''}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent-cyan)]"
            >
              {groups.map((g, i) => (
                <option key={g.projectName} value={g.projectName}>
                  {projectLabels[i]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Insights Content */}
        {sessionIdForProject ? (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>}>
            <InsightsPanel sessionId={sessionIdForProject} />
          </Suspense>
        ) : (
          <EmptyState message="No sessions found. Start a Claude Code session to see insights." className="py-20" />
        )}
      </div>
    </div>
  )
}
