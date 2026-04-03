import { useState, useCallback } from 'react'
import { useParams, Outlet, Link } from 'react-router-dom'
import { Brain, ArrowLeft, ArrowRight, Keyboard, Users, X } from 'lucide-react'
import { Chip, Meter, Skeleton } from '@heroui/react'
import { useSessionDetail } from '../hooks/useSessionDetail'
import { StatusIndicator } from '../components/StatusIndicator'
import { Header } from '../components/Header'
import { SectionCard, MetadataField, ErrorAlert, EmptyState, ThemedChip, CollapsibleSection } from '../components/ui'
import { ConversationTimeline, StatBox, SkillsSubagentsSection, ToolUsageSection, SessionContent } from '../components/session'
import { timeAgo, formatTokens, formatDuration, formatElapsed, contextColor, GitBranchIcon, getClientIcon, ideDeepLink } from '../utils'

function TeammateResolver({ sessionId, targetName }: { sessionId: string; targetName: string }) {
  const { detail, loading } = useSessionDetail(sessionId)

  if (loading || !detail) {
    return (
      <div className="p-4 animate-pulse space-y-3">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-24 h-3 rounded" />
              <Skeleton className="w-full h-12 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const name = detail.agentName || detail.name || detail.sessionId.slice(0, 8)
  if (name !== targetName) return null

  return <SessionContent detail={detail} label={name} showSidebar={false} />
}

function TeammateSidebar({ teammateSessionIds, targetName, onClose }: { teammateSessionIds: string[]; targetName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Panel */}
      <div className="relative w-[800px] max-w-full h-full bg-[var(--bg-primary)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--accent-green)]" />
            <span className="text-lg font-semibold text-[var(--text-bright)]">{targetName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {teammateSessionIds.map(sid => (
            <TeammateResolver key={sid} sessionId={sid} targetName={targetName} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { detail, loading, error } = useSessionDetail(sessionId ?? '')
  const [showAllTurns, setShowAllTurns] = useState(false)
  const handleShowAll = useCallback(() => setShowAllTurns(true), [])
  const [selectedTeammateName, setSelectedTeammateName] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="w-full min-h-screen">
        <Header />
        <div className="pl-8 pr-4 py-6 pb-0 max-sm:px-4 max-sm:py-4 max-sm:pb-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="w-40 h-8 rounded" />
            <span className="text-3xl text-[var(--text-secondary)] font-light opacity-30">&mdash;</span>
            <Skeleton className="w-24 h-8 rounded" />
            <div className="flex items-center gap-2 ml-auto">
              <Skeleton className="w-20 h-6 rounded-full" />
              <Skeleton className="w-32 h-5 rounded" />
            </div>
          </div>
        </div>
        <div className="pl-8 pr-4 py-6 max-sm:px-4 max-sm:py-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          <div className="order-2 lg:order-1 min-w-0 space-y-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-24 h-3 rounded" />
                  <Skeleton className="w-full h-16 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                <Skeleton className="w-28 h-4 rounded" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: i === 0 ? 4 : 2 }, (_, j) => (
                    <div key={j} className="bg-[var(--bg-primary)] rounded-lg p-3 space-y-1.5">
                      <Skeleton className="w-16 h-3 rounded" />
                      <Skeleton className="w-12 h-5 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="w-full min-h-screen">
        <Header />
        <div className="px-8 py-6 max-sm:px-4 max-sm:py-4">
          <div className="mt-8 text-center">
            <ErrorAlert message={error ?? 'Session not found'} />
          </div>
        </div>
      </div>
    )
  }

  const slug = detail.sessionId.slice(0, 8)
  const isActive = detail.isActive
  const isWaiting = detail.waitingForInput
  const hasTeammates = detail.teammateSessionIds && detail.teammateSessionIds.length > 0
  const pct = detail.maxContextTokens > 0
    ? Math.round((detail.contextTokens / detail.maxContextTokens) * 100)
    : 0

  return (
    <div className="w-full min-h-screen">
      <Header />
      <Outlet />

      {/* Session Header - full width */}
      <div className="pl-8 pr-4 py-6 pb-0 max-sm:px-4 max-sm:py-4 max-sm:pb-0">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusIndicator isActive={isActive} isWaiting={isWaiting} size={10} />
          {detail.projectName && (
            <span className="text-3xl font-bold text-[var(--text-bright)]">
              {detail.projectName.split('/').pop() || detail.projectName}
            </span>
          )}
          {detail.projectName && (
            <span className="text-3xl text-[var(--text-secondary)] font-light">&mdash;</span>
          )}
          {detail.name ? (
            <>
              <span className="text-3xl font-semibold text-[var(--text-bright)]">{detail.name}</span>
              <span className="text-[var(--text-secondary)] opacity-50 font-mono text-base">{slug}</span>
              {isWaiting && (
                <span title="Waiting for user input"><Keyboard className="text-warning/70 shrink-0" size={16} /></span>
              )}
            </>
          ) : (
            <>
              <span className="text-3xl font-mono font-semibold text-[var(--text-bright)]">{slug}</span>
              {isWaiting && (
                <span title="Waiting for user input"><Keyboard className="text-warning/70 shrink-0" size={16} /></span>
              )}
            </>
          )}
          <div className="flex items-center gap-2 ml-auto text-right">
            {detail.teamName && (
              <ThemedChip color="green">
                <Users size={12} />
                {detail.agentName ? detail.agentName : `Team: ${detail.teamName}`}
              </ThemedChip>
            )}
            {detail.model && <ThemedChip color="cyan">{detail.model}</ThemedChip>}
            {detail.version && (
              <Chip size="sm" variant="secondary" className="font-mono text-sm text-[var(--text-secondary)]">
                v{detail.version}
              </Chip>
            )}
            <span className="text-[var(--text-secondary)] text-base font-mono">
              {detail.startTimestamp && formatElapsed(detail.startTimestamp, detail.timestamp)}{' '}
              ({timeAgo(detail.timestamp)})
            </span>
          </div>
        </div>
      </div>

      {/* Continuation links */}
      {(detail.continuedFrom || detail.continuedAs) && (
        <div className="px-8 max-sm:px-4 flex items-center gap-3 flex-wrap">
          {detail.continuedFrom && (
            <Link
              to={`/session/${detail.continuedFrom}`}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
            >
              <ArrowLeft size={14} />
              Previous session
              <span className="font-mono opacity-60">{detail.continuedFrom.slice(0, 8)}</span>
            </Link>
          )}
          {detail.continuedFrom && detail.continuedAs && (
            <span className="text-[var(--text-secondary)] opacity-30">|</span>
          )}
          {detail.continuedAs && (
            <Link
              to={`/session/${detail.continuedAs}`}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
            >
              Continued via /clear
              <span className="font-mono opacity-60">{detail.continuedAs.slice(0, 8)}</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="pl-8 pr-4 py-6 max-sm:px-4 max-sm:py-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        <div className="order-2 lg:order-1 min-w-0">
          {detail.turns.length > 0 ? (
            <ConversationTimeline
              turns={detail.turns}
              isActive={isActive}
              isWaiting={isWaiting}
              showAll={showAllTurns}
              onShowAll={handleShowAll}
              onTeammateClick={hasTeammates ? setSelectedTeammateName : undefined}
            />
          ) : (
            <EmptyState message="No conversation yet" />
          )}
        </div>
        <div className="order-1 lg:order-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <CollapsibleSection title="Session Info">
            <SectionCard className="space-y-3">
              {detail.cwd && (
                <MetadataField label="Working Directory" info="The filesystem path where this Claude Code session is running.">
                  <span className="font-mono text-base text-[var(--text-primary)] break-all">{detail.cwd}</span>
                </MetadataField>
              )}
              {(detail.gitBranch || detail.client) && (
                <div className="flex items-center justify-between gap-3">
                  {detail.gitBranch && (
                    <MetadataField label="Branch" info="The active git branch in the working directory.">
                      <span className="inline-flex items-center gap-1.5 font-mono text-base text-[var(--text-primary)]">
                        <GitBranchIcon /> {detail.gitBranch}
                      </span>
                    </MetadataField>
                  )}
                  {detail.client && (
                    <MetadataField label="Client" info="The IDE or terminal client connected to this session.">
                      <span className="inline-flex items-center gap-1.5 text-base text-[var(--text-primary)]">
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
                    </MetadataField>
                  )}
                </div>
              )}
              {detail.usesMemory && (
                <MetadataField label="Memory" info="Whether Claude's persistent memory system is enabled for this project.">
                  <Link to={`/session/${detail.sessionId}/memory`}>
                    <ThemedChip color="magenta" interactive className="text-sm">
                      <Brain size={14} /> Memory
                    </ThemedChip>
                  </Link>
                </MetadataField>
              )}
              {detail.contextTokens > 0 && (
                <MetadataField label="Context Usage" info="How much of the model's context window has been consumed. High usage may trigger compaction.">
                  <Meter value={pct} minValue={0} maxValue={100} color={contextColor(detail.contextTokens, detail.maxContextTokens)}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-base font-mono text-[var(--text-secondary)]">
                        {formatTokens(detail.contextTokens)} / {formatTokens(detail.maxContextTokens)}
                      </span>
                      {detail.maxContextTokens > 0 && (
                        <Meter.Output className="text-base font-mono text-[var(--text-secondary)] opacity-70" />
                      )}
                    </div>
                    <Meter.Track className="h-1.5 bg-white/10 rounded-full">
                      <Meter.Fill className="rounded-full" />
                    </Meter.Track>
                  </Meter>
                </MetadataField>
              )}
            </SectionCard>
          </CollapsibleSection>

          <CollapsibleSection title="Token Stats">
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Input Tokens" value={formatTokens(detail.totalInputTokens)} info="Total tokens sent to the model, including system prompts and conversation history." />
              <StatBox label="Output Tokens" value={formatTokens(detail.totalOutputTokens)} info="Total tokens generated by the model in responses." />
              <StatBox label="Cache Creation" value={formatTokens(detail.totalCacheCreationTokens)} info="Tokens written to the prompt cache. Caching reduces cost and latency on repeated context." />
              <StatBox label="Cache Read" value={formatTokens(detail.totalCacheReadTokens)} info="Tokens read from the prompt cache instead of being reprocessed." />
              <StatBox label="Duration" value={formatDuration(detail.totalDurationMs)} info="Total wall-clock time the model spent generating responses." />
              <StatBox label="Turns" value={String(detail.turnCount)} info="Number of conversation turns (user message + assistant response pairs)." />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Skills & Subagents">
            <SkillsSubagentsSection sessionId={detail.sessionId} commandsUsed={detail.commandsUsed} skillsUsed={detail.skillsUsed} subagentsUsed={detail.subagentsUsed} />
          </CollapsibleSection>

          <CollapsibleSection title="Tool Usage">
            <ToolUsageSection toolUsage={detail.toolUsage} mcpToolUsage={detail.mcpToolUsage} />
          </CollapsibleSection>
        </div>
      </div>

      {/* Teammate sidebar panel */}
      {selectedTeammateName && hasTeammates && (
        <TeammateSidebar
          teammateSessionIds={detail.teammateSessionIds}
          targetName={selectedTeammateName}
          onClose={() => setSelectedTeammateName(null)}
        />
      )}
    </div>
  )
}
