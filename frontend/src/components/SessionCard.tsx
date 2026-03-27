import type { ReactNode } from 'react'
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

const VSCodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M11.5 1L5.5 7L2.5 4.5L1 5.5L5.5 9.5L13 2.5L11.5 1Z" fill="#007ACC" />
    <path d="M1 5.5V10.5L2.5 11.5L5.5 9L11.5 15L13 13.5V2.5L11.5 1L5.5 7L2.5 4.5L1 5.5Z" fill="#007ACC" opacity="0.8" />
  </svg>
)

const CursorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M3 1L3 13L6 10L9 14L11 13L8 9L12 8L3 1Z" fill="#58A6FF" />
  </svg>
)

const PyCharmIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#21D789" />
    <rect x="4" y="11" width="5" height="1.5" fill="#000" />
    <text x="4.5" y="9" fontSize="7" fontWeight="bold" fill="#000" fontFamily="sans-serif">P</text>
  </svg>
)

const IntelliJIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#087CFA" />
    <rect x="4" y="11" width="5" height="1.5" fill="#FFF" />
    <text x="4.5" y="9" fontSize="7" fontWeight="bold" fill="#FFF" fontFamily="sans-serif">IJ</text>
  </svg>
)

const GoLandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#078D6E" />
    <rect x="4" y="11" width="5" height="1.5" fill="#FFF" />
    <text x="4" y="9" fontSize="7" fontWeight="bold" fill="#FFF" fontFamily="sans-serif">GL</text>
  </svg>
)

const WebStormIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#00CDD7" />
    <rect x="4" y="11" width="5" height="1.5" fill="#000" />
    <text x="3.5" y="9" fontSize="7" fontWeight="bold" fill="#000" fontFamily="sans-serif">WS</text>
  </svg>
)

const ZedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M8 1L6 6H7.5L5 15L10 8H8L10 1H8Z" fill="#F5A623" />
  </svg>
)

const WindsurfIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 10C3 7 5 9 7 7C9 5 11 8 13 6C14 5.3 15 4 15 4" stroke="#3FBFA0" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M1 13C3 10 5 12 7 10C9 8 11 11 13 9C14 8.3 15 7 15 7" stroke="#3FBFA0" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
  </svg>
)

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="1" y="2" width="14" height="12" rx="2" stroke="#7d8590" strokeWidth="1.5" fill="none" />
    <path d="M4 6L7 8L4 10" stroke="#7d8590" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="10" x2="12" y2="10" stroke="#7d8590" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

function getClientIcon(client: string): ReactNode {
  const c = client.toLowerCase()
  if (c.includes('cursor')) return <CursorIcon />
  if (c.includes('code')) return <VSCodeIcon />
  if (c.includes('pycharm')) return <PyCharmIcon />
  if (c.includes('intellij')) return <IntelliJIcon />
  if (c.includes('goland')) return <GoLandIcon />
  if (c.includes('webstorm')) return <WebStormIcon />
  if (c.includes('zed')) return <ZedIcon />
  if (c.includes('windsurf')) return <WindsurfIcon />
  return <TerminalIcon />
}

function ideDeepLink(client: string, cwd: string): string | null {
  const c = client.toLowerCase()
  if (c.includes('cursor')) return `cursor://file/${cwd}`
  if (c.includes('code')) return `vscode://file/${cwd}`
  if (c.includes('windsurf')) return `windsurf://file/${cwd}`
  if (c.includes('zed')) return `zed://file/${cwd}`
  if (c.includes('pycharm')) return `pycharm://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('intellij')) return `idea://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('goland')) return `goland://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('webstorm')) return `webstorm://open?file=${encodeURIComponent(cwd)}`
  return null
}

export function SessionCard({ session }: SessionCardProps) {
  const slug = session.sessionId.slice(0, 8)
  const isActive = session.isActive
  const hasFooter = session.gitBranch || session.usesMemory || session.client

  return (
    <div className={`session-card ${isActive ? (session.waitingForInput ? 'session-waiting-input' : 'session-active') : ''}`}>
      <div className="session-card-header">
        {isActive && !session.waitingForInput && <span className="session-active-dot" />}
        {isActive && session.waitingForInput && (
          <span className="session-waiting" title="Waiting for input">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.75-1a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </span>
        )}
        <span className={`session-slug ${isActive ? 'slug-active' : 'slug-idle'}`}>
          {slug}
        </span>
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
          {session.client && (
            (() => {
              const link = ideDeepLink(session.client, session.cwd)
              return link ? (
                <a href={link} className="badge badge-client" title={`Open in ${session.client}`} target="_blank" rel="noopener noreferrer">
                  {getClientIcon(session.client)} {session.client}
                </a>
              ) : (
                <span className="badge badge-client" title={session.client}>
                  {getClientIcon(session.client)} {session.client}
                </span>
              )
            })()
          )}
        </div>
      )}
    </div>
  )
}
