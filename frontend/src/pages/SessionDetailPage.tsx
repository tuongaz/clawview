import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, Outlet, Link } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { Brain } from 'lucide-react'
import { Chip, Meter, Spinner } from '@heroui/react'
import { useSessionDetail } from '../hooks/useSessionDetail'
import { StatusIndicator, TypingDots, LiveBadge } from '../components/StatusIndicator'
import type { Turn } from '../types'
import { Header } from '../components/Header'
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
      <div className="w-full min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="w-full min-h-screen">
        <Header />
        <div className="px-8 py-6 max-sm:px-4 max-sm:py-4">
          <div className="mt-8 text-center text-[var(--accent-red)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg p-6">
            {error ?? 'Session not found'}
          </div>
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
    <div className="w-full min-h-screen">
      <Header />
      <Outlet />

      {/* Two-column layout */}
      <div className="px-8 py-6 max-sm:px-4 max-sm:py-4 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* Left: Session Header + Conversation Timeline — on mobile shows second */}
        <div className="order-2 lg:order-1 min-w-0">
          {/* Session Header */}
          <div className="mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusIndicator isActive={isActive} isWaiting={isWaiting} size={9} />
              {detail.name && (
                <h1 className="text-xl font-semibold text-[var(--text-bright)]">
                  {detail.name}
                </h1>
              )}
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
          </div>

          {detail.turns.length > 0 ? (
            <ConversationTimeline turns={detail.turns} isActive={isActive} isWaiting={isWaiting} />
          ) : (
            <div className="text-center text-[var(--text-secondary)] py-12 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
              No conversation yet
            </div>
          )}
        </div>

        {/* Right: Session Details — on mobile shows first, sticky on desktop */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-[60px] lg:self-start lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto space-y-4">

          {/* Metadata */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 space-y-3">
            {detail.cwd && (
              <div>
                <span className="text-[var(--text-secondary)] text-xs block mb-1">Working Directory</span>
                <span className="font-mono text-xs text-[var(--text-primary)] break-all">{detail.cwd}</span>
              </div>
            )}

            {(detail.gitBranch || detail.client) && (
              <div className="flex items-center justify-between gap-3">
                {detail.gitBranch && (
                  <div>
                    <span className="text-[var(--text-secondary)] text-xs block mb-1">Branch</span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-primary)]">
                      <GitBranchIcon /> {detail.gitBranch}
                    </span>
                  </div>
                )}
                {detail.client && (
                  <div className="text-right">
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
              </div>
            )}

            {detail.usesMemory && (
              <div>
                <span className="text-[var(--text-secondary)] text-xs block mb-1">Memory</span>
                <Link to={`/session/${detail.sessionId}/memory`}>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="accent"
                    className="font-mono text-[10px] text-[var(--accent-magenta)] bg-[rgba(188,140,255,0.1)] border border-[rgba(188,140,255,0.2)] gap-1 cursor-pointer hover:bg-[rgba(188,140,255,0.2)] hover:border-[rgba(188,140,255,0.4)] transition-all"
                  >
                    <Brain size={12} /> Memory Enabled
                  </Chip>
                </Link>
              </div>
            )}

            {detail.contextTokens > 0 && (
              <div>
                <span className="text-[var(--text-secondary)] text-xs block mb-1">Context Usage</span>
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
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Input Tokens" value={formatTokens(detail.totalInputTokens)} />
            <StatBox label="Output Tokens" value={formatTokens(detail.totalOutputTokens)} />
            <StatBox label="Cache Creation" value={formatTokens(detail.totalCacheCreationTokens)} />
            <StatBox label="Cache Read" value={formatTokens(detail.totalCacheReadTokens)} />
            <StatBox label="Duration" value={formatDuration(detail.totalDurationMs)} />
            <StatBox label="Turns" value={String(detail.turnCount)} />
          </div>

          {/* Commands, Skills & Subagents */}
          <SkillsSubagentsSection commandsUsed={detail.commandsUsed} skillsUsed={detail.skillsUsed} subagentsUsed={detail.subagentsUsed} />

          {/* Tool Usage */}
          <ToolUsageSection toolUsage={detail.toolUsage} mcpToolUsage={detail.mcpToolUsage} />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-center">
      <div className="text-[var(--text-secondary)] text-[11px] mb-1">{label}</div>
      <div className="text-[var(--text-bright)] font-mono text-base font-semibold">{value}</div>
    </div>
  )
}

function formatMcpToolName(name: string): string {
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
          <span className="text-xs text-[var(--text-primary)] font-mono w-[140px] truncate shrink-0" title={name}>
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

function ConversationTimeline({ turns, isActive, isWaiting }: { turns: Turn[]; isActive: boolean; isWaiting: boolean }) {
  const [showAll, setShowAll] = useState(false)
  const visibleTurns = showAll ? turns : turns.slice(0, INITIAL_TURNS_SHOWN)
  const hasMore = turns.length > INITIAL_TURNS_SHOWN
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevTurnCountRef = useRef(turns.length)

  useEffect(() => {
    if (turns.length > prevTurnCountRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevTurnCountRef.current = turns.length
  }, [turns.length])

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-3 flex items-center gap-2">
        Conversation Timeline ({turns.length} turn{turns.length !== 1 ? 's' : ''})
        {isActive && <LiveBadge />}
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
      {isActive && <TypingDots isWaiting={isWaiting} />}
      <div ref={bottomRef} />
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

      {turn.userPrompt && (
        <div className="text-sm text-[var(--text-primary)] mb-2 break-words">
          <TaskNotificationContent text={turn.userPrompt} />
        </div>
      )}

      {turn.events.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {turn.events.map((ev, i) =>
            ev.kind === 'tool' ? (
              <div key={i} className="flex items-center gap-1.5 text-sm font-mono truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] shrink-0" />
                <span className="text-[var(--text-primary)] font-bold shrink-0">{ev.toolName}</span>
                {ev.toolDetail && (
                  <span className="text-[var(--text-secondary)] truncate">{ev.toolDetail}</span>
                )}
              </div>
            ) : (
              <div key={i} className="flex gap-1.5 text-sm text-[var(--text-primary)] break-words">
                <span className="flex items-center shrink-0 h-[1.5em] leading-[1.5em]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /></span>
                <TaskNotificationContent text={ev.text} />
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function parseTaskNotification(text: string): { before: string; summary: string; result: string; after: string } | null {
  const tnMatch = text.match(/<task-notification>([\s\S]*?)<\/task-notification>/)
  if (!tnMatch) return null
  const inner = tnMatch[1]
  const summaryMatch = inner.match(/<summary>([\s\S]*?)<\/summary>/)
  const resultMatch = inner.match(/<result>([\s\S]*?)<\/result>/)
  if (!summaryMatch) return null
  const before = text.slice(0, tnMatch.index!)
  const after = text.slice(tnMatch.index! + tnMatch[0].length)
  return {
    before: before.trim(),
    summary: summaryMatch[1].trim(),
    result: resultMatch ? resultMatch[1].trim() : '',
    after: after.trim(),
  }
}

function TaskNotificationContent({ text }: { text: string }) {
  const parsed = useMemo(() => parseTaskNotification(text), [text])
  const [showResult, setShowResult] = useState(false)

  const mdClass = "prose prose-invert prose-sm max-w-none min-w-0"

  if (!parsed) {
    return (
      <div className={mdClass}>
        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</Markdown>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {parsed.before && (
        <div className={`${mdClass} mb-1`}>
          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.before}</Markdown>
        </div>
      )}
      <div className={mdClass}>
        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.summary}</Markdown>
      </div>
      {parsed.result && (
        <>
          <button
            onClick={() => setShowResult(!showResult)}
            className="mt-1 text-xs text-[var(--accent-cyan)] hover:underline cursor-pointer bg-transparent border-none p-0"
          >
            {showResult ? 'Hide details' : 'Show details'}
          </button>
          {showResult && (
            <div className={`${mdClass} mt-1 text-[var(--text-secondary)]`}>
              <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.result}</Markdown>
            </div>
          )}
        </>
      )}
      {parsed.after && !/Full transcript available at/i.test(parsed.after) && (
        <div className={`${mdClass} mt-1`}>
          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.after}</Markdown>
        </div>
      )}
    </div>
  )
}

function SkillsSubagentsSection({ commandsUsed, skillsUsed, subagentsUsed }: { commandsUsed: string[]; skillsUsed: string[]; subagentsUsed: string[] }) {
  const hasCommands = commandsUsed && commandsUsed.length > 0
  const hasSkills = skillsUsed && skillsUsed.length > 0
  const hasSubagents = subagentsUsed && subagentsUsed.length > 0
  if (!hasCommands && !hasSkills && !hasSubagents) return null

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      {hasCommands && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-2">Commands</h3>
          <div className="flex flex-wrap gap-1.5">
            {commandsUsed.map((c) => (
              <Chip key={c} size="sm" variant="soft" className="font-mono text-[11px] text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)]">
                {c}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {hasSkills && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-2">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {skillsUsed.map((s) => (
              <Chip key={s} size="sm" variant="soft" className="font-mono text-[11px] text-[var(--accent-yellow)] bg-[rgba(210,153,34,0.1)] border border-[rgba(210,153,34,0.2)]">
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {hasSubagents && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-2">Subagents</h3>
          <div className="flex flex-wrap gap-1.5">
            {subagentsUsed.map((s) => (
              <Chip key={s} size="sm" variant="soft" className="font-mono text-[11px] text-[var(--accent-green)] bg-[rgba(63,185,80,0.1)] border border-[rgba(63,185,80,0.2)]">
                {s}
              </Chip>
            ))}
          </div>
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
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-center text-[var(--text-secondary)] text-sm">
        No tools used
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
