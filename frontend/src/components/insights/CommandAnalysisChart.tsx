import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartCard } from './ChartCard'
import type { InsightsUserInteractions } from '../../types'

interface CommandAnalysisChartProps {
  userInteractions: InsightsUserInteractions
}

export function CommandAnalysisChart({ userInteractions }: CommandAnalysisChartProps) {
  const dist = userInteractions.tool_count_distribution
  const total = Object.values(dist).reduce((s, v) => s + v, 0)

  if (total === 0) return null

  const data = Object.entries(dist)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([tools, count]) => ({
      tools: `${tools} tools`,
      percentage: Math.round((count / total) * 100),
    }))

  return (
    <ChartCard title="User Command Analysis">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="tools"
            tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 15 }}
            labelStyle={{ color: 'var(--text-bright)' }}
            formatter={(value) => value != null ? `${value}%` : ''}
          />
          <Bar dataKey="percentage" fill="#48bb78" radius={[4, 4, 0, 0]} name="Commands" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
