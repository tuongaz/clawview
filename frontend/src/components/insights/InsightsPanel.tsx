import { Spinner } from '@heroui/react'
import { useInsights } from '../../hooks/useInsights'
import { EmptyState } from '../ui'
import { StatCards } from './StatCards'
import { ToolUsageChart } from './ToolUsageChart'
import { HourlyTokenChart } from './HourlyTokenChart'
import { CommandAnalysisChart } from './CommandAnalysisChart'
import { ModelUsageChart } from './ModelUsageChart'
import { ErrorDistributionChart } from './ErrorDistributionChart'
import { TokenOverTimeChart } from './TokenOverTimeChart'
import { DailyCostChart } from './DailyCostChart'
import { CommandComplexityChart } from './CommandComplexityChart'
import { CommandLengthChart } from './CommandLengthChart'
import { ToolTrendsChart } from './ToolTrendsChart'
import { InterruptionRateChart } from './InterruptionRateChart'
import { ErrorRateChart } from './ErrorRateChart'
import { ToolCategoryChart } from './ToolCategoryChart'
import { SubAgentSkillChart } from './SubAgentSkillChart'
import { McpUsageChart } from './McpUsageChart'

interface InsightsPanelProps {
  sessionId: string
}

export function InsightsPanel({ sessionId }: InsightsPanelProps) {
  const { insights, loading, error } = useInsights(sessionId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-[var(--accent-red)] text-sm">
        {error}
      </div>
    )
  }

  if (!insights) {
    return <EmptyState message="No insights data available yet. Start a session to see analytics." />
  }

  return (
    <div className="mt-4 space-y-6">
      <StatCards insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ToolUsageChart tools={insights.tools} />
        <ToolCategoryChart advancedTools={insights.advanced_tools} />
        <HourlyTokenChart hourlyPattern={insights.hourly_pattern} />
        <CommandAnalysisChart userInteractions={insights.user_interactions} />
        <ModelUsageChart userInteractions={insights.user_interactions} />
        <ErrorDistributionChart errors={insights.errors} />
        <TokenOverTimeChart dailyStats={insights.daily_stats} />
        <DailyCostChart dailyStats={insights.daily_stats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SubAgentSkillChart advancedTools={insights.advanced_tools} />
        <McpUsageChart advancedTools={insights.advanced_tools} />
        <CommandComplexityChart commandDetails={insights.command_details} />
        <CommandLengthChart commandDetails={insights.command_details} />
        <ToolTrendsChart commandDetails={insights.command_details} />
        <InterruptionRateChart commandDetails={insights.command_details} />
        <ErrorRateChart
          commandDetails={insights.command_details}
          errorDetails={insights.errors.details}
        />
      </div>
    </div>
  )
}
