import {Card, Switch} from '@heroui/react'
import type {ProjectGroup, TokenStats} from '../types'

interface HeaderProps {
    groups: ProjectGroup[]
    stats: TokenStats | null
    connected: boolean
    activeOnly: boolean
    onToggleActiveOnly: (value: boolean) => void
}

function formatStatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
        const m = tokens / 1_000_000
        return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
    }
    if (tokens >= 1_000) {
        return `${Math.round(tokens / 1_000)}K`
    }
    return `${tokens}`
}

export function Header({groups, stats, activeOnly, onToggleActiveOnly}: HeaderProps) {
    const totalSessions = groups.reduce((sum, g) => sum + g.sessions.length, 0)
    const activeSessions = groups.reduce(
        (sum, g) => sum + g.sessions.filter((s) => s.isActive).length,
        0
    )
    const projectCount = groups.length

    return (
        <Card className="mb-7">
            <Card.Header
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4">
                {/* Left: title + stats */}
                <div className="flex items-center gap-3.5">
                    <span className="text-[var(--accent-cyan)] text-[22px] leading-none">&#9670;</span>
                    <h1 className="font-[var(--font-mono)] text-lg font-bold text-white tracking-wide">ClawHawk</h1>
                    <span className="text-[var(--text-secondary)] text-[13px] pl-3.5 border-l border-[var(--border)]">
            {totalSessions} session{totalSessions !== 1 ? 's' : ''}
                        {activeSessions > 0 && <> &middot; {activeSessions} active</>}
                        {' '}&middot; {projectCount} project{projectCount !== 1 ? 's' : ''}
          </span>
                </div>

                {/* Center: token stats */}
                {stats && (
                    <div
                        className="flex items-center gap-4 px-4 border-l border-r border-[var(--border)] max-sm:border-none max-sm:px-0">
                        {([
                            ['Today', stats.today],
                            ['Week', stats.thisWeek],
                            ['Month', stats.thisMonth],
                        ] as const).map(([label, period]) => (
                            <div key={label} className="flex flex-col items-center gap-0.5">
                                <span
                                    className="text-[10px] font-[var(--font-mono)] text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
                                <span
                                    className="text-sm font-[var(--font-mono)] font-semibold text-[var(--text-primary)]">
                  {formatStatTokens(period.inputTokens + period.outputTokens)}
                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Right: live toggle + connection status */}
                <div className="flex items-center gap-3 text-xs">
                    <Switch
                        size="lg"
                        isSelected={activeOnly}
                        onChange={onToggleActiveOnly}
                    >
                        <Switch.Control className={activeOnly ? 'bg-[var(--accent-green)]' : undefined}>
                            <Switch.Thumb/>
                        </Switch.Control>
                    </Switch>
                </div>
            </Card.Header>
        </Card>
    )
}
