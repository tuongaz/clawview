import { InfoTip } from '../ui'
import type { ProjectInsights } from '../../types'

interface StatCardProps {
  label: string
  value: string
  details: string[]
  info: string
}

function StatCard({ label, value, details, info }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 relative">
      <div className="absolute top-1.5 right-1.5">
        <InfoTip text={info} />
      </div>
      <div className="text-[var(--text-secondary)] text-[11px] mb-1">{label}</div>
      <div className="text-[var(--text-bright)] font-mono text-lg font-semibold">{value}</div>
      <div className="mt-1.5 space-y-0.5">
        {details.map((d, i) => (
          <div key={i} className="text-[var(--text-secondary)] text-[11px] font-mono">{d}</div>
        ))}
      </div>
    </div>
  )
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`
}

function usd(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(3)}`
  return `$${n.toFixed(4)}`
}

function dateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!end || start === end) return s
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${s} — ${e}`
}

interface StatCardsProps {
  insights: ProjectInsights
}

export function StatCards({ insights }: StatCardsProps) {
  const { overview, user_interactions: ui, cache, tools } = insights

  // Compute total cost from daily stats
  const totalCost = Object.values(insights.daily_stats).reduce((sum, d) => sum + d.cost, 0)

  // Compute cost breakdown from token totals
  // Approximate: input tokens cost more than output, etc.
  const totalTokens = overview.total_tokens
  const inputTokens = totalTokens.input + totalTokens.cache_creation + totalTokens.cache_read
  const outputTokens = totalTokens.output

  const distinctTools = Object.keys(tools.usage_counts).length
  const totalToolCalls = Object.values(tools.usage_counts).reduce((sum, c) => sum + c, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <StatCard
        label="User Commands"
        value={String(ui.real_user_messages)}
        details={[
          `${fmt(ui.avg_tokens_per_command)} avg tokens/cmd`,
          dateRange(overview.date_range.start, overview.date_range.end),
        ]}
        info="Total real user commands (excluding tool results and system messages). Shows average token usage per command and the project date range."
      />

      <StatCard
        label="Interruption Rate"
        value={pct(ui.interruption_rate)}
        details={[
          `${Math.round(ui.real_user_messages * ui.interruption_rate / 100)} of ${ui.real_user_messages} interrupted`,
        ]}
        info="Percentage of user commands that were interrupted before completion. High rates may indicate timeout issues or impatience."
      />

      <StatCard
        label="Steps per Command"
        value={ui.avg_steps_per_command.toFixed(1)}
        details={[
          `${ui.avg_tools_per_command.toFixed(1)} avg tools/cmd`,
        ]}
        info="Average number of assistant message steps per user command. More steps typically means more complex tasks."
      />

      <StatCard
        label="Tool Use Rate"
        value={pct(ui.tool_use_rate)}
        details={[
          `${distinctTools} distinct tools`,
          `${fmt(totalToolCalls)} total calls`,
        ]}
        info="Percentage of commands that required at least one tool call. Shows how tool-heavy the workflow is."
      />

      <StatCard
        label="Project Cost"
        value={usd(totalCost)}
        details={[
          `${fmt(inputTokens)} input tokens`,
          `${fmt(outputTokens)} output tokens`,
        ]}
        info="Estimated total API cost based on model pricing and token usage. Includes input, output, cache creation, and cache read costs."
      />

      <StatCard
        label="Cache Efficiency"
        value={fmt(cache.total_read)}
        details={[
          `${pct(cache.hit_rate)} hit rate`,
          `${pct(cache.efficiency)} efficiency`,
          `${fmt(cache.tokens_saved)} tokens saved`,
        ]}
        info="Cache read tokens and efficiency metrics. Higher hit rate means more tokens served from cache, reducing cost and latency."
      />

      <StatCard
        label="Automation Score"
        value={pct(insights.advanced_tools.automation_score)}
        details={[
          `${fmt(insights.advanced_tools.total_tool_calls)} total tool calls`,
          `${Object.keys(insights.advanced_tools.subagent_usage).length} agent types, ${Object.keys(insights.advanced_tools.skill_usage).length} skills`,
        ]}
        info="Percentage of tool calls that are AI delegation (Agent + Skill). Higher scores indicate more agentic, parallelized workflows."
      />

      <StatCard
        label="Search / Edit Ratio"
        value={pct(insights.advanced_tools.search_edit_ratio.ratio)}
        details={[
          `${fmt(insights.advanced_tools.search_edit_ratio.search)} search calls`,
          `${fmt(insights.advanced_tools.search_edit_ratio.modification)} modification calls`,
        ]}
        info="Ratio of search/read operations (Grep, Glob, Read) to modification operations (Write, Edit, Bash). Higher ratio means more exploration before changes."
      />

      <StatCard
        label="Cost per Command"
        value={usd(insights.advanced_tools.cost_per_command)}
        details={[
          `${ui.real_user_messages} total commands`,
          `${usd(totalCost)} total cost`,
        ]}
        info="Average API cost per user command. Helps identify expensive workflows and optimize usage."
      />
    </div>
  )
}
