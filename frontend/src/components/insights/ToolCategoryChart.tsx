import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import type { AdvancedToolStats } from '../../types'

const COLORS = ['#667eea', '#764ba2', '#48bb78', '#ef4444', '#f59e0b', '#ed8936', '#58a6ff', '#bc8cff', '#3fb950', '#d29922']

interface ToolCategoryChartProps {
  advancedTools: AdvancedToolStats
}

function fmt(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function ToolCategoryChart({ advancedTools }: ToolCategoryChartProps) {
  const data = Object.entries(advancedTools.tool_categories)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Tool Categories">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 15 }}
            labelStyle={{ color: 'var(--text-bright)' }}
            formatter={(value) => value != null ? fmt(Number(value)) : ''}
          />
          <Legend
            wrapperStyle={{ fontSize: 14 }}
            formatter={(value: string) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
