import { useState, useMemo } from 'react'
import { Switch, Skeleton } from '@heroui/react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Header } from '../components/Header'
import { ProjectBox } from '../components/ProjectBox'
import { EmptyState } from '../components/ui'
import { formatTokens } from '../utils'

function SessionCardSkeleton() {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius)] shadow-md shadow-black/20 p-4 flex flex-col gap-3">
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
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-7">
      {[0, 1].map((i) => (
        <div key={i} className="p-5">
          <div className="flex items-center gap-3 pb-4">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="w-32 h-5 rounded" />
            <Skeleton className="w-48 h-4 rounded" />
            <Skeleton className="ml-auto w-24 h-4 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {Array.from({ length: i === 0 ? 3 : 2 }, (_, j) => (
              <SessionCardSkeleton key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Dashboard() {
  const { groups, stats, loading } = useWebSocket()
  const [activeOnly, setActiveOnly] = useState(false)

  // Build display labels, disambiguating duplicate folder names with parent
  const projectLabels = useMemo(() => {
    const shortNames = groups.map(g => g.projectName.split('/').pop() || g.projectName)
    const counts = new Map<string, number>()
    for (const name of shortNames) counts.set(name, (counts.get(name) || 0) + 1)
    return new Map(groups.map((g, i) => {
      const short = shortNames[i]
      if (counts.get(short)! > 1) {
        const parts = g.projectName.split('/')
        return [g.projectName, parts.length >= 2 ? `${parts[parts.length - 2]}/${short}` : g.projectName]
      }
      return [g.projectName, short]
    }))
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (!activeOnly) return groups
    return groups
      .map((g) => ({ ...g, sessions: g.sessions.filter((s) => s.isActive) }))
      .filter((g) => g.sessions.length > 0)
  }, [groups, activeOnly])

  const totalSessions = groups.reduce((sum, g) => sum + g.sessions.length, 0)
  const activeSessions = groups.reduce(
    (sum, g) => sum + g.sessions.filter((s) => s.isActive).length,
    0
  )
  const projectCount = groups.length

  return (
    <>
      <Header>
        <span className="text-[var(--text-secondary)] text-[13px] pl-3.5 border-l border-[var(--border)]">
          {totalSessions} session{totalSessions !== 1 ? 's' : ''}
          {activeSessions > 0 && <> &middot; {activeSessions} active</>}
          {' '}&middot; {projectCount} project{projectCount !== 1 ? 's' : ''}
        </span>

        {stats && (
          <div className="flex items-center gap-4 px-4 border-l border-r border-[var(--border)] max-sm:border-none max-sm:px-0">
            {([
              ['Today', stats.today],
              ['Week', stats.thisWeek],
              ['Month', stats.thisMonth],
            ] as const).map(([label, period]) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-[var(--font-mono)] text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
                <span className="text-sm font-[var(--font-mono)] font-semibold text-[var(--text-primary)]">
                  {formatTokens(period.inputTokens + period.outputTokens)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Switch
            size="lg"
            isSelected={activeOnly}
            onChange={setActiveOnly}
          >
            <Switch.Control className={activeOnly ? 'bg-[var(--accent-green)]' : undefined}>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </div>
      </Header>

      <div className="w-full px-8 py-6 max-sm:px-4 max-sm:py-4">
        <main className="flex flex-col gap-7">
          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {filteredGroups.map((group) => (
                <ProjectBox
                  key={group.projectName}
                  group={group}
                  displayName={projectLabels.get(group.projectName) || group.projectName}
                />
              ))}
              {filteredGroups.length === 0 && (
                <EmptyState message={activeOnly ? 'No running sessions.' : 'No sessions found.'} className="py-20" />
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}
