import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import type { DailyStatEntry } from '../../types'

interface TokenOverTimeChartProps {
  dailyStats: Record<string, DailyStatEntry>
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtDate(date: string): string {
  // "2026-03-28" → "Mar 28"
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TokenOverTimeChart({ dailyStats }: TokenOverTimeChartProps) {
  const data = Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => ({
      date: fmtDate(date),
      fullDate: date,
      input: (entry.tokens.input ?? 0) + (entry.tokens.cache_creation ?? 0) + (entry.tokens.cache_read ?? 0),
      output: entry.tokens.output ?? 0,
    }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Token Usage Over Time">
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
            tickFormatter={fmtTokens}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-bright)' }}
            itemStyle={{ color: 'var(--text-secondary)' }}
            formatter={(value) => value != null ? fmtTokens(Number(value)) : ''}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
          <Bar dataKey="input" stackId="tokens" fill="#667eea" name="Input" radius={[0, 0, 0, 0]} />
          <Bar dataKey="output" stackId="tokens" fill="#764ba2" name="Output" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
