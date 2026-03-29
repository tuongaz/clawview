import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChartCard } from './ChartCard'
import { bucketCommands } from './dynamicInterval'
import type { CommandDetail } from '../../types'

const TOOL_COLORS = [
  '#667eea', '#764ba2', '#48bb78', '#ef4444', '#f59e0b',
  '#ed8936', '#58a6ff', '#bc8cff', '#3fb950', '#d29922',
]

interface ToolTrendsChartProps {
  commandDetails: CommandDetail[]
}

export function ToolTrendsChart({ commandDetails }: ToolTrendsChartProps) {
  const buckets = bucketCommands(commandDetails)
  if (buckets.length === 0) return null

  // Find top 10 tools across all commands
  const toolCounts: Record<string, number> = {}
  for (const cmd of commandDetails) {
    for (const t of cmd.tool_names) {
      toolCounts[t] = (toolCounts[t] || 0) + 1
    }
  }
  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)

  if (topTools.length === 0) return null

  // Build cumulative usage per tool per bucket
  const cumulativeCounts: Record<string, number> = {}
  for (const t of topTools) cumulativeCounts[t] = 0

  const data = buckets.map((b) => {
    for (const cmd of b.commands) {
      for (const t of cmd.tool_names) {
        if (t in cumulativeCounts) {
          cumulativeCounts[t]++
        }
      }
    }
    const point: Record<string, string | number> = { label: b.label }
    for (const t of topTools) {
      point[t] = cumulativeCounts[t]
    }
    return point
  })

  return (
    <ChartCard title="Tool Usage Trends">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 15,
            }}
            labelStyle={{ color: 'var(--text-bright)' }}
            itemStyle={{ color: 'var(--text-secondary)' }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {topTools.map((tool, i) => (
            <Line
              key={tool}
              type="monotone"
              dataKey={tool}
              name={tool}
              stroke={TOOL_COLORS[i % TOOL_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
