import type { ReactNode } from 'react'
import { Brain } from 'lucide-react'
import { Card, Chip, Tooltip, Meter } from '@heroui/react'
import type { Session } from '../types'
import { timeAgo } from '../App'

interface SessionCardProps {
  session: Session
  projectPath: string
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

function contextColor(tokens: number, max: number): 'default' | 'warning' | 'danger' {
  if (max === 0) return 'default'
  const pct = (tokens / max) * 100
  if (pct > 90) return 'danger'
  if (pct >= 70) return 'warning'
  return 'default'
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

export function SessionCard({ session, projectPath }: SessionCardProps) {
  const slug = session.sessionId.slice(0, 8)
  const isActive = session.isActive
  const isWaiting = session.waitingForInput
  const hasFooter = session.gitBranch || session.usesMemory || session.client || session.contextTokens > 0

  const borderClass = isActive
    ? isWaiting
      ? 'border-warning'
      : 'border-success'
    : 'border-[var(--border)]'

  const pct = session.maxContextTokens > 0
    ? Math.round((session.contextTokens / session.maxContextTokens) * 100)
    : 0

  return (
    <Card
      className={`bg-[var(--bg-primary)] border ${borderClass} hover:bg-[var(--bg-card)] shadow-md shadow-black/20 ${isActive ? 'bg-[var(--bg-card)]' : ''}`}
    >
      <Card.Header className="flex-row items-center gap-2 px-4 pt-3 pb-0">
        {isActive && !isWaiting ? (
          <span className="inline-block w-[7px] h-[7px] rounded-full bg-success shadow-[0_0_8px_rgba(63,185,80,0.5)] animate-pulse-blink shrink-0" />
        ) : isActive && isWaiting ? (
          <span className="inline-flex items-center text-warning animate-pulse-blink" title="Waiting for input">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.75-1a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </span>
        ) : (
          <span className="inline-block w-[7px] h-[7px] rounded-full bg-[var(--text-secondary)] opacity-40 shrink-0" />
        )}
        {session.name ? (
          <>
            <span className={`font-semibold text-xs truncate max-w-[160px] ${isActive ? 'text-[var(--text-bright)]' : 'text-[var(--text-primary)]'}`}>
              {session.name}
            </span>
            <span className="text-[var(--text-secondary)] font-mono text-[11px]">
              {slug}
            </span>
          </>
        ) : (
          <span className={`font-mono font-semibold text-xs tracking-wider ${isActive ? 'text-[var(--text-bright)]' : 'text-[var(--text-secondary)]'}`}>
            {slug}
          </span>
        )}
        <span className="ml-auto text-[var(--text-secondary)] text-[11px] font-mono">
          {timeAgo(session.timestamp)}
        </span>
      </Card.Header>

      <Card.Content className="flex flex-col gap-2.5 px-4 py-2">
        {session.lastUserPrompt && (
          <div className="text-[var(--text-primary)] text-xs leading-[1.4] whitespace-pre-wrap break-words line-clamp-3">
            {session.lastUserPrompt.startsWith('/') ? (
              <><span className="text-[11px] opacity-60 mr-0.5">&#8984;</span> {session.lastUserPrompt}</>
            ) : (
              session.lastUserPrompt
            )}
          </div>
        )}

        {session.lastAction && (
          <div className="flex items-center gap-1.5 text-warning text-[11px] font-mono bg-warning/[0.08] py-1 px-2.5 rounded-[var(--radius-sm)] line-clamp-2 break-words">
            {isActive && !isWaiting ? (
              <span className="inline-block w-[6px] h-[6px] rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)] animate-pulse-blink shrink-0" />
            ) : (
              <span className="text-[11px] shrink-0">&#9889;</span>
            )}
            {session.lastAction}
          </div>
        )}
      </Card.Content>

      {hasFooter && (
        <Card.Footer className="flex items-center gap-2 px-4 pt-3 pb-3 border-t border-[var(--border-light)] mt-auto">
          {session.gitBranch && (
            <Tooltip>
              <Tooltip.Trigger>
                <Chip size="sm" variant="secondary" className="bg-transparent border-0 text-[var(--text-secondary)] font-mono text-[11px] px-0 gap-1 max-w-[200px]">
                  <GitBranchIcon />
                  <span className="truncate">{session.gitBranch}</span>
                </Chip>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                Branch: {session.gitBranch}
              </Tooltip.Content>
            </Tooltip>
          )}
          {session.usesMemory && (
            <Tooltip>
              <Tooltip.Trigger>
                <Chip size="sm" variant="soft" color="accent" className="font-mono text-[10px] text-[var(--accent-magenta)] bg-[rgba(188,140,255,0.1)] border border-[rgba(188,140,255,0.2)] gap-1">
                  <Brain size={12} /> Memory
                </Chip>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                This session uses memory files
              </Tooltip.Content>
            </Tooltip>
          )}
          {session.client && (
            <Tooltip>
              <Tooltip.Trigger>
                {(() => {
                  const link = ideDeepLink(session.client, projectPath)
                  return link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Chip size="sm" variant="soft" className="font-mono text-[10px] text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] gap-1 cursor-pointer hover:bg-[rgba(88,166,255,0.2)] hover:border-[rgba(88,166,255,0.4)] transition-all">
                        {getClientIcon(session.client)} {session.client}
                      </Chip>
                    </a>
                  ) : (
                    <Chip size="sm" variant="soft" className="font-mono text-[10px] text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] gap-1">
                      {getClientIcon(session.client)} {session.client}
                    </Chip>
                  )
                })()}
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                {ideDeepLink(session.client, projectPath) ? `Open in ${session.client}` : session.client}
              </Tooltip.Content>
            </Tooltip>
          )}
          <div className="flex-1" />
          {session.contextTokens > 0 && (
            <Tooltip>
              <Tooltip.Trigger>
                <div className="cursor-default min-w-[100px] max-w-[140px]">
                  <Meter
                    value={pct}
                    minValue={0}
                    maxValue={100}
                    color={contextColor(session.contextTokens, session.maxContextTokens)}
                    className="w-full"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                        {formatTokens(session.contextTokens)} / {formatTokens(session.maxContextTokens)}
                      </span>
                      {session.maxContextTokens > 0 && (
                        <Meter.Output className="text-[10px] font-mono text-[var(--text-secondary)] opacity-70" />
                      )}
                    </div>
                    <Meter.Track className="h-1 bg-white/10 rounded-full">
                      <Meter.Fill className="rounded-full" />
                    </Meter.Track>
                  </Meter>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                Context: {formatTokens(session.contextTokens)} / {formatTokens(session.maxContextTokens)} ({pct}%)
              </Tooltip.Content>
            </Tooltip>
          )}
        </Card.Footer>
      )}
    </Card>
  )
}
