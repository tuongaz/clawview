import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartCard } from './ChartCard'
import type { InsightsTools } from '../../types'

const COLORS = ['#667eea', '#764ba2', '#48bb78', '#ef4444', '#f59e0b', '#ed8936', '#58a6ff', '#bc8cff', '#3fb950', '#d29922']

interface ToolUsageChartProps {
  tools: InsightsTools
}

export function ToolUsageChart({ tools }: ToolUsageChartProps) {
  const data = Object.entries(tools.usage_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Tool Usage (Top 10)">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-bright)' }}
            itemStyle={{ color: 'var(--text-secondary)' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
