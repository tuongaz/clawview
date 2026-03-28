import { lazy, Suspense } from 'react'
import { useParams, Outlet, Link } from 'react-router-dom'
import { Brain } from 'lucide-react'
import { Chip, Meter, Spinner, Tabs } from '@heroui/react'
import { useSessionDetail } from '../hooks/useSessionDetail'
import { StatusIndicator } from '../components/StatusIndicator'
import { Header } from '../components/Header'
import { SectionCard, MetadataField, ErrorAlert, EmptyState, ThemedChip } from '../components/ui'
import { ConversationTimeline, StatBox, SkillsSubagentsSection, ToolUsageSection } from '../components/session'
import { timeAgo, formatTokens, formatDuration, contextColor, GitBranchIcon, getClientIcon, ideDeepLink } from '../utils'

const InsightsPanel = lazy(() =>
  import('../components/insights/InsightsPanel').then(m => ({ default: m.InsightsPanel }))
)

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
  const pct = detail.maxContextTokens > 0
    ? Math.round((detail.contextTokens / detail.maxContextTokens) * 100)
    : 0

  return (
    <div className="w-full min-h-screen">
      <Header />
      <Outlet />

      {/* Session Header - full width */}
      <div className="px-8 py-6 pb-0 max-sm:px-4 max-sm:py-4 max-sm:pb-0 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusIndicator isActive={isActive} isWaiting={isWaiting} size={10} />
          {detail.projectName && (
            <span className="text-2xl font-bold text-[var(--text-bright)]">
              {detail.projectName.split('/').pop() || detail.projectName}
            </span>
          )}
          {detail.projectName && (
            <span className="text-2xl text-[var(--text-secondary)] font-light">&mdash;</span>
          )}
          {detail.name ? (
            <>
              <span className="text-2xl font-semibold text-[var(--text-bright)]">{detail.name}</span>
              <span className="text-[var(--text-secondary)] opacity-50 font-mono text-sm">{slug}</span>
            </>
          ) : (
            <span className="text-2xl font-mono font-semibold text-[var(--text-bright)]">{slug}</span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {detail.model && <ThemedChip color="cyan">{detail.model}</ThemedChip>}
            {detail.version && (
              <Chip size="sm" variant="secondary" className="font-mono text-[11px] text-[var(--text-secondary)]">
                v{detail.version}
              </Chip>
            )}
            <span className="text-[var(--text-secondary)] text-sm">{timeAgo(detail.timestamp)}</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-sm:px-4 max-sm:py-4 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Tabbed Content */}
        <div className="order-2 lg:order-1 min-w-0">
          <Tabs variant="secondary" className="w-full">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Session tabs">
                <Tabs.Tab id="session">Session<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="analyse">Insights<Tabs.Indicator /></Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="session">
              <div className="mt-4">
                {detail.turns.length > 0 ? (
                  <ConversationTimeline turns={detail.turns} isActive={isActive} isWaiting={isWaiting} />
                ) : (
                  <EmptyState message="No conversation yet" />
                )}
              </div>
            </Tabs.Panel>

            <Tabs.Panel id="analyse">
              <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>}>
                <InsightsPanel sessionId={sessionId ?? ''} />
              </Suspense>
            </Tabs.Panel>
          </Tabs>
        </div>

        {/* Right: Session Details */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-[60px] lg:self-start lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto space-y-4">
          <SectionCard className="space-y-3">
            {detail.cwd && (
              <MetadataField label="Working Directory" info="The filesystem path where this Claude Code session is running.">
                <span className="font-mono text-xs text-[var(--text-primary)] break-all">{detail.cwd}</span>
              </MetadataField>
            )}

            {(detail.gitBranch || detail.client) && (
              <div className="flex items-center justify-between gap-3">
                {detail.gitBranch && (
                  <MetadataField label="Branch" info="The active git branch in the working directory.">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-primary)]">
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
                  <ThemedChip color="magenta" interactive className="text-[10px]">
                    <Brain size={12} /> Memory Enabled
                  </ThemedChip>
                </Link>
              </MetadataField>
            )}

            {detail.contextTokens > 0 && (
              <MetadataField label="Context Usage" info="How much of the model's context window has been consumed. High usage may trigger compaction.">
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
              </MetadataField>
            )}
          </SectionCard>

          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Input Tokens" value={formatTokens(detail.totalInputTokens)} info="Total tokens sent to the model, including system prompts and conversation history." />
            <StatBox label="Output Tokens" value={formatTokens(detail.totalOutputTokens)} info="Total tokens generated by the model in responses." />
            <StatBox label="Cache Creation" value={formatTokens(detail.totalCacheCreationTokens)} info="Tokens written to the prompt cache. Caching reduces cost and latency on repeated context." />
            <StatBox label="Cache Read" value={formatTokens(detail.totalCacheReadTokens)} info="Tokens read from the prompt cache instead of being reprocessed." />
            <StatBox label="Duration" value={formatDuration(detail.totalDurationMs)} info="Total wall-clock time the model spent generating responses." />
            <StatBox label="Turns" value={String(detail.turnCount)} info="Number of conversation turns (user message + assistant response pairs)." />
          </div>

          <SkillsSubagentsSection sessionId={detail.sessionId} commandsUsed={detail.commandsUsed} skillsUsed={detail.skillsUsed} subagentsUsed={detail.subagentsUsed} />
          <ToolUsageSection toolUsage={detail.toolUsage} mcpToolUsage={detail.mcpToolUsage} />
        </div>
      </div>
    </div>
  )
}
