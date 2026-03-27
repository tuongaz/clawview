import type { Session } from '../types'
import { timeAgo } from '../App'

interface SessionCardProps {
  session: Session
}

const GitBranchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
  </svg>
)

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`
  }
  return `${tokens}`
}

function contextColorClass(tokens: number, max: number): string {
  if (max === 0) return ''
  const pct = (tokens / max) * 100
  if (pct > 90) return 'context-critical'
  if (pct >= 70) return 'context-warning'
  return ''
}

export function SessionCard({ session }: SessionCardProps) {
  const slug = session.sessionId.slice(0, 8)
  const isActive = session.isActive
  const hasFooter = session.gitBranch || session.usesMemory

  return (
    <div className={`session-card ${isActive ? 'session-active' : ''}`}>
      <div className="session-card-header">
        <span className={`session-slug ${isActive ? 'slug-active' : 'slug-idle'}`}>
          {slug}
        </span>
        {isActive && !session.waitingForInput && <span className="session-active-dot" />}
        {isActive && session.waitingForInput && (
          <span className="session-waiting" title="Waiting for input">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.75-1a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </span>
        )}
        <div className="session-meta">
          <span className="session-time">{timeAgo(session.timestamp)}</span>
        </div>
      </div>

      {session.lastUserPrompt && (
        <div className="session-user-prompt">{session.lastUserPrompt}</div>
      )}

      {session.lastAction && (
        <div className="session-action">
          <span className="action-icon">&#9889;</span>
          {session.lastAction}
        </div>
      )}

      {session.contextTokens > 0 && (
        <div className={`session-context ${contextColorClass(session.contextTokens, session.maxContextTokens)}`}>
          {formatTokens(session.contextTokens)} / {formatTokens(session.maxContextTokens)}
          {session.maxContextTokens > 0 && (
            <span className="context-pct">
              {' '}({Math.round((session.contextTokens / session.maxContextTokens) * 100)}%)
            </span>
          )}
        </div>
      )}

      {hasFooter && (
        <div className="session-footer">
          {session.gitBranch && (
            <span className="session-branch" title={session.gitBranch}>
              <GitBranchIcon /> {session.gitBranch}
            </span>
          )}
          {session.usesMemory && (
            <span className="badge badge-memory" title="Uses memory">&#128024; Memory</span>
          )}
        </div>
      )}
    </div>
  )
}
