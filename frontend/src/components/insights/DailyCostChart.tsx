import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import type { DailyStatEntry } from '../../types'

interface DailyCostChartProps {
  dailyStats: Record<string, DailyStatEntry>
}

function fmtCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}

function fmtDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DailyCostChart({ dailyStats }: DailyCostChartProps) {
  const data = Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => ({
      date: fmtDate(date),
      fullDate: date,
      input: entry.cost_breakdown?.input ?? 0,
      output: entry.cost_breakdown?.output ?? 0,
      cache: entry.cost_breakdown?.cache ?? 0,
    }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Daily Cost Breakdown">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtCost}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-bright)' }}
            itemStyle={{ color: 'var(--text-secondary)' }}
            formatter={(value) => value != null ? fmtCost(Number(value)) : ''}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
          <Bar dataKey="input" stackId="cost" fill="#667eea" name="Input" radius={[0, 0, 0, 0]} />
          <Bar dataKey="output" stackId="cost" fill="#764ba2" name="Output" radius={[0, 0, 0, 0]} />
          <Bar dataKey="cache" stackId="cost" fill="#48bb78" name="Cache" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
