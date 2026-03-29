import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import type { InsightsErrors } from '../../types'

const COLORS = ['#ef4444', '#f59e0b', '#ed8936', '#667eea', '#764ba2', '#48bb78', '#58a6ff', '#bc8cff', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#fb923c', '#94a3b8']

interface ErrorDistributionChartProps {
  errors: InsightsErrors
}

export function ErrorDistributionChart({ errors }: ErrorDistributionChartProps) {
  const data = Object.entries(errors.by_category)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ name: category, value: count }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Error Distribution">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
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
            formatter={(value) => value ?? 0}
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
