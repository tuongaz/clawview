import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Brain } from 'lucide-react'
import { Chip, Meter, Spinner } from '@heroui/react'
import { useSessionDetail } from '../hooks/useSessionDetail'
import type { Turn } from '../types'
import {
  timeAgo,
  formatTokens,
  formatDuration,
  contextColor,
  GitBranchIcon,
  getClientIcon,
  ideDeepLink,
} from '../utils'

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { detail, loading, error } = useSessionDetail(sessionId ?? '')

  if (loading) {
    return (
      <div className="w-full px-8 py-6 max-sm:px-4 max-sm:py-4">
        <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="w-full px-8 py-6 max-sm:px-4 max-sm:py-4">
        <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">
          &larr; Back to Dashboard
        </Link>
        <div className="mt-8 text-center text-[var(--accent-red)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg p-6">
          {error ?? 'Session not found'}
        </div>
      </div>
    )
  }

  const slug = detail.sessionId.slice(0, 8)
  const isActive = detail.isActive
  const isWaiting = detail.waitingForInput
  const pct = detail.maxContextTokens > 0
    ? Math.round((detail.contextTokens / detail.maxContextTokens) * 100)
    : 0

  return (
    <div className="w-full px-8 py-6 max-sm:px-4 max-sm:py-4 max-w-5xl mx-auto">
      <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">
        &larr; Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        {isActive && !isWaiting ? (
          <span className="inline-block w-[9px] h-[9px] rounded-full bg-success shadow-[0_0_8px_rgba(63,185,80,0.5)] animate-pulse-blink shrink-0" />
        ) : isActive && isWaiting ? (
          <span className="inline-flex items-center text-warning animate-pulse-blink shrink-0" title="Waiting for input">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.75-1a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </span>
        ) : (
          <span className="inline-block w-[9px] h-[9px] rounded-full bg-[var(--text-secondary)] opacity-40 shrink-0" />
        )}

        <h1 className="text-xl font-semibold text-[var(--text-bright)]">
          {detail.name || 'Unnamed Session'}
        </h1>
        <span className="text-[var(--text-secondary)] font-mono text-sm">{slug}</span>
        <span className="text-[var(--text-secondary)] text-sm ml-auto">{timeAgo(detail.timestamp)}</span>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {detail.model && (
          <Chip size="sm" variant="soft" className="font-mono text-[11px] text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)]">
            {detail.model}
          </Chip>
        )}
        {detail.version && (
          <Chip size="sm" variant="secondary" className="font-mono text-[11px] text-[var(--text-secondary)]">
            v{detail.version}
          </Chip>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
        {detail.cwd && (
          <div className="col-span-1 sm:col-span-2">
            <span className="text-[var(--text-secondary)] text-xs block mb-1">Working Directory</span>
            <span className="font-mono text-xs text-[var(--text-primary)] break-all">{detail.cwd}</span>
          </div>
        )}

        {detail.projectName && (
          <div>
            <span className="text-[var(--text-secondary)] text-xs block mb-1">Project</span>
            <span className="text-sm text-[var(--text-primary)]">{detail.projectName}</span>
          </div>
        )}

        {detail.gitBranch && (
          <div>
            <span className="text-[var(--text-secondary)] text-xs block mb-1">Branch</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-primary)]">
              <GitBranchIcon /> {detail.gitBranch}
            </span>
          </div>
        )}

        {detail.firstPrompt && (
          <div className="col-span-1 sm:col-span-2">
            <span className="text-[var(--text-secondary)] text-xs block mb-1">First Prompt</span>
            <span className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">{detail.firstPrompt}</span>
          </div>
        )}

        {detail.client && (
          <div>
            <span className="text-[var(--text-secondary)] text-xs block mb-1">Client</span>
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
              {getClientIcon(detail.client)}
              {(() => {
                const link = ideDeepLink(detail.client, detail.cwd)
                return link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline">
                    {detail.client}
                  </a>
                ) : (
                  detail.client
                )
              })()}
            </span>
          </div>
        )}

        {detail.usesMemory && (
          <div>
            <span className="text-[var(--text-secondary)] text-xs block mb-1">Memory</span>
            <Chip size="sm" variant="soft" color="accent" className="font-mono text-[10px] text-[var(--accent-magenta)] bg-[rgba(188,140,255,0.1)] border border-[rgba(188,140,255,0.2)] gap-1">
              <Brain size={12} /> Memory Enabled
            </Chip>
          </div>
        )}

        {detail.contextTokens > 0 && (
          <div className="col-span-1 sm:col-span-2">
            <span className="text-[var(--text-secondary)] text-xs block mb-1">Context Usage</span>
            <div className="max-w-xs">
              <Meter
                value={pct}
                minValue={0}
                maxValue={100}
                color={contextColor(detail.contextTokens, detail.maxContextTokens)}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {formatTokens(detail.contextTokens)} / {formatTokens(detail.maxContextTokens)}
                  </span>
                  {detail.maxContextTokens > 0 && (
                    <Meter.Output className="text-xs font-mono text-[var(--text-secondary)] opacity-70" />
                  )}
                </div>
                <Meter.Track className="h-1.5 bg-white/10 rounded-full">
                  <Meter.Fill className="rounded-full" />
                </Meter.Track>
              </Meter>
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="mt-4 flex flex-wrap gap-3">
        <StatBox label="Input Tokens" value={formatTokens(detail.totalInputTokens)} />
        <StatBox label="Output Tokens" value={formatTokens(detail.totalOutputTokens)} />
        <StatBox label="Cache Creation" value={formatTokens(detail.totalCacheCreationTokens)} />
        <StatBox label="Cache Read" value={formatTokens(detail.totalCacheReadTokens)} />
        <StatBox label="Duration" value={formatDuration(detail.totalDurationMs)} />
        <StatBox label="Turns" value={String(detail.turnCount)} />
      </div>

      {/* Tool Usage */}
      <ToolUsageSection toolUsage={detail.toolUsage} mcpToolUsage={detail.mcpToolUsage} />

      {/* Conversation Timeline */}
      {detail.turns.length > 0 && (
        <ConversationTimeline turns={detail.turns} />
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-[120px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-center">
      <div className="text-[var(--text-secondary)] text-[11px] mb-1">{label}</div>
      <div className="text-[var(--text-bright)] font-mono text-lg font-semibold">{value}</div>
    </div>
  )
}

function formatMcpToolName(name: string): string {
  // mcp__serena__find_symbol → "serena: find_symbol"
  const parts = name.replace(/^mcp__/, '').split('__')
  if (parts.length >= 2) {
    return `${parts[0]}: ${parts.slice(1).join('__')}`
  }
  return name
}

function ToolBarList({ items, color }: { items: [string, number][]; color: string }) {
  const max = Math.max(...items.map(([, c]) => c))
  return (
    <div className="space-y-1.5">
      {items.map(([name, count]) => (
        <div key={name} className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-primary)] font-mono w-[180px] truncate shrink-0" title={name}>
            {name}
          </span>
          <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.max((count / max) * 100, 2)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-mono w-8 text-right shrink-0">{count}</span>
        </div>
      ))}
    </div>
  )
}

const INITIAL_TURNS_SHOWN = 30

function ConversationTimeline({ turns }: { turns: Turn[] }) {
  const [showAll, setShowAll] = useState(false)
  const visibleTurns = showAll ? turns : turns.slice(0, INITIAL_TURNS_SHOWN)
  const hasMore = turns.length > INITIAL_TURNS_SHOWN

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-3">
        Conversation Timeline ({turns.length} turn{turns.length !== 1 ? 's' : ''})
      </h3>
      <div className="space-y-2">
        {visibleTurns.map((turn) => (
          <TurnCard key={turn.index} turn={turn} />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 w-full py-2 text-sm text-[var(--accent-cyan)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:bg-[rgba(88,166,255,0.1)] transition-colors cursor-pointer"
        >
          Show all {turns.length} turns ({turns.length - INITIAL_TURNS_SHOWN} more)
        </button>
      )}
    </div>
  )
}

function TurnCard({ turn }: { turn: Turn }) {
  const ts = turn.timestamp ? new Date(turn.timestamp) : null
  const timeStr = ts && !isNaN(ts.getTime())
    ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3">
      {/* Turn header */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(88,166,255,0.15)] text-[var(--accent-cyan)] text-[11px] font-mono font-semibold shrink-0">
          {turn.index}
        </span>
        {timeStr && (
          <span className="text-[var(--text-secondary)] text-xs font-mono">{timeStr}</span>
        )}
        {turn.durationMs > 0 && (
          <span className="text-[var(--text-secondary)] text-[11px] font-mono ml-auto">
            {formatDuration(turn.durationMs)}
          </span>
        )}
      </div>

      {/* User prompt */}
      {turn.userPrompt && (
        <div className="text-sm text-[var(--text-primary)] line-clamp-3 mb-2 whitespace-pre-wrap break-words">
          {turn.userPrompt}
        </div>
      )}

      {/* Tool call chips */}
      {turn.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {turn.toolCalls.map((tc, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[rgba(88,166,255,0.08)] text-[var(--accent-cyan)] border border-[rgba(88,166,255,0.15)]"
              title={tc.detail}
            >
              <span className="font-semibold">{tc.name}</span>
              {tc.detail && (
                <span className="text-[var(--text-secondary)] max-w-[200px] truncate">: {tc.detail}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Assistant text snippet */}
      {turn.assistantText && (
        <div className="text-xs text-[var(--text-secondary)] line-clamp-2 whitespace-pre-wrap break-words italic">
          {turn.assistantText}
        </div>
      )}
    </div>
  )
}

function ToolUsageSection({ toolUsage, mcpToolUsage }: { toolUsage: Record<string, number>; mcpToolUsage: Record<string, number> }) {
  const builtinEntries = Object.entries(toolUsage).sort((a, b) => b[1] - a[1])
  const mcpEntries = Object.entries(mcpToolUsage)
    .map(([name, count]) => [formatMcpToolName(name), count] as [string, number])
    .sort((a, b) => b[1] - a[1])

  if (builtinEntries.length === 0 && mcpEntries.length === 0) {
    return (
      <div className="mt-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-center text-[var(--text-secondary)] text-sm">
        No tools used
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {builtinEntries.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-3">Built-in Tools</h3>
          <ToolBarList items={builtinEntries} color="var(--accent-cyan)" />
        </div>
      )}
      {mcpEntries.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-3">MCP Tools</h3>
          <ToolBarList items={mcpEntries} color="var(--accent-magenta)" />
        </div>
      )}
    </div>
  )
}
