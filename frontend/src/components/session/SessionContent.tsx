import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Keyboard } from 'lucide-react'
import { Chip, Meter } from '@heroui/react'
import type { SessionDetail } from '../../types'
import { StatusIndicator } from '../StatusIndicator'
import { SectionCard, MetadataField, ThemedChip, CollapsibleSection, EmptyState } from '../ui'
import { ConversationTimeline } from './ConversationTimeline'
import { StatBox } from './StatBox'
import { SkillsSubagentsSection } from './SkillsSubagentsSection'
import { ToolUsageSection } from './ToolUsageSection'
import { timeAgo, formatTokens, formatDuration, formatElapsed, contextColor, GitBranchIcon, getClientIcon, ideDeepLink } from '../../utils'

interface SessionContentProps {
  detail: SessionDetail
  label?: string
  showSidebar?: boolean
  hideTeammateMessages?: boolean
  onTeammateClick?: (teammateId: string) => void
}

export function SessionContent({ detail, label, showSidebar = true, onTeammateClick }: SessionContentProps) {
  const [showAllTurns, setShowAllTurns] = useState(false)
  const handleShowAll = useCallback(() => setShowAllTurns(true), [])

  const slug = detail.sessionId.slice(0, 8)
  const isActive = detail.isActive
  const isWaiting = detail.waitingForInput
  const pct = detail.maxContextTokens > 0
    ? Math.round((detail.contextTokens / detail.maxContextTokens) * 100)
    : 0

  return (
    <div className="min-w-0">
      {/* Session header */}
      <div className="pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusIndicator isActive={isActive} isWaiting={isWaiting} size={8} />
          {label ? (
            <span className="text-xl font-semibold text-[var(--text-bright)]">{label}</span>
          ) : detail.name ? (
            <span className="text-xl font-semibold text-[var(--text-bright)]">{detail.name}</span>
          ) : (
            <span className="text-xl font-mono font-semibold text-[var(--text-bright)]">{slug}</span>
          )}
          <span className="text-[var(--text-secondary)] opacity-50 font-mono text-sm">{slug}</span>
          {isWaiting && (
            <span title="Waiting for user input"><Keyboard className="text-warning/70 shrink-0" size={14} /></span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {detail.model && <ThemedChip color="cyan"><span className="text-xs">{detail.model}</span></ThemedChip>}
            {detail.version && (
              <Chip size="sm" variant="secondary" className="font-mono text-xs text-[var(--text-secondary)]">
                v{detail.version}
              </Chip>
            )}
            <span className="text-[var(--text-secondary)] text-sm font-mono">
              {detail.startTimestamp && formatElapsed(detail.startTimestamp, detail.timestamp)}{' '}
              ({timeAgo(detail.timestamp)})
            </span>
          </div>
        </div>
      </div>

      {showSidebar ? (
        /* Conversation + Sidebar grid */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="order-2 lg:order-1 min-w-0">
            {detail.turns.length > 0 ? (
              <ConversationTimeline turns={detail.turns} isActive={isActive} isWaiting={isWaiting} showAll={showAllTurns} onShowAll={handleShowAll} onTeammateClick={onTeammateClick} />
            ) : (
              <EmptyState message="No conversation yet" />
            )}
          </div>
          <div className="order-1 lg:order-2 space-y-3">
            <CollapsibleSection title="Session Info">
              <SectionCard className="space-y-3">
                {detail.cwd && (
                  <MetadataField label="Working Directory" info="The filesystem path where this Claude Code session is running.">
                    <span className="font-mono text-sm text-[var(--text-primary)] break-all">{detail.cwd}</span>
                  </MetadataField>
                )}
                {(detail.gitBranch || detail.client) && (
                  <div className="flex items-center justify-between gap-3">
                    {detail.gitBranch && (
                      <MetadataField label="Branch" info="The active git branch in the working directory.">
                        <span className="inline-flex items-center gap-1.5 font-mono text-sm text-[var(--text-primary)]">
                          <GitBranchIcon /> {detail.gitBranch}
                        </span>
                      </MetadataField>
                    )}
                    {detail.client && (
                      <MetadataField label="Client" info="The IDE or terminal client connected to this session.">
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
                        <span className="text-sm font-mono text-[var(--text-secondary)]">
                          {formatTokens(detail.contextTokens)} / {formatTokens(detail.maxContextTokens)}
                        </span>
                        {detail.maxContextTokens > 0 && (
                          <Meter.Output className="text-sm font-mono text-[var(--text-secondary)] opacity-70" />
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
                <StatBox label="Input Tokens" value={formatTokens(detail.totalInputTokens)} info="Total tokens sent to the model." />
                <StatBox label="Output Tokens" value={formatTokens(detail.totalOutputTokens)} info="Total tokens generated by the model." />
                <StatBox label="Cache Creation" value={formatTokens(detail.totalCacheCreationTokens)} info="Tokens written to the prompt cache." />
                <StatBox label="Cache Read" value={formatTokens(detail.totalCacheReadTokens)} info="Tokens read from the prompt cache." />
                <StatBox label="Duration" value={formatDuration(detail.totalDurationMs)} info="Total wall-clock time for responses." />
                <StatBox label="Turns" value={String(detail.turnCount)} info="Number of conversation turns." />
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
      ) : (
        /* Conversation only, no sidebar */
        <div className="min-w-0">
          {detail.turns.length > 0 ? (
            <ConversationTimeline turns={detail.turns} isActive={isActive} isWaiting={isWaiting} showAll={showAllTurns} onShowAll={handleShowAll} />
          ) : (
            <EmptyState message="No conversation yet" />
          )}
        </div>
      )}
    </div>
  )
}
