import { useState } from 'react'
import type { ProjectGroup } from '../types'
import { SessionCard } from './SessionCard'

const ACCENT_COLORS = [
  '#58a6ff', // blue
  '#3fb950', // green
  '#d29922', // yellow
  '#bc8cff', // magenta
  '#f78166', // orange
  '#f85149', // red
]

interface ProjectBoxProps {
  group: ProjectGroup
  colorIndex: number
}

function projectDisplayName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

export function ProjectBox({ group, colorIndex }: ProjectBoxProps) {
  const accent = ACCENT_COLORS[colorIndex % ACCENT_COLORS.length]
  const name = projectDisplayName(group.projectName)

  const activeSessions = group.sessions.filter((s) => s.isActive)
  const idleSessions = group.sessions.filter((s) => !s.isActive)
  const hasIdle = idleSessions.length > 0
  const hasActive = activeSessions.length > 0

  const [expanded, setExpanded] = useState(false)

  const defaultSessions = hasActive ? activeSessions : idleSessions.slice(0, 4)
  const visibleSessions = expanded ? group.sessions : defaultSessions
  const hiddenCount = group.sessions.length - defaultSessions.length

  return (
    <section className="project-section">
      <div className="project-heading">
        {hasActive && <span className="project-active-dot" />}
        <span className="project-name" style={{ color: accent }}>{name}</span>
        <span className="project-path">{group.path}</span>
        <span className="project-count">
          {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
          {hasActive && ` · ${activeSessions.length} active`}
        </span>
      </div>
      <div className="project-sessions">
        {visibleSessions.map((session) => (
          <SessionCard key={session.sessionId} session={session} />
        ))}
        {!expanded && hiddenCount > 0 && (
          <div className="show-more-row">
            <button className="show-more-btn" onClick={() => setExpanded(true)}>
              Show {hiddenCount} more session{hiddenCount !== 1 ? 's' : ''}
            </button>
          </div>
        )}
        {expanded && hasIdle && hasActive && (
          <div className="show-more-row">
            <button className="show-more-btn" onClick={() => setExpanded(false)}>
              Show less
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
