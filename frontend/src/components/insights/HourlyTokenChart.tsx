import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import type { InsightsHourlyPattern } from '../../types'

interface HourlyTokenChartProps {
  hourlyPattern: InsightsHourlyPattern
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function HourlyTokenChart({ hourlyPattern }: HourlyTokenChartProps) {
  const data = Array.from({ length: 24 }, (_, hour) => {
    const key = String(hour)
    const tokens = hourlyPattern.tokens[key]
    return {
      hour: `${hour}:00`,
      input: tokens?.input ?? 0,
      output: tokens?.output ?? 0,
    }
  })

  const hasData = data.some(d => d.input > 0 || d.output > 0)
  if (!hasData) return null

  return (
    <ChartCard title="Hourly Token Pattern">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="hour"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={2}
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
            formatter={(value: number) => fmtTokens(value)}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
          <Bar dataKey="input" stackId="tokens" fill="#667eea" name="Input" radius={[0, 0, 0, 0]} />
          <Bar dataKey="output" stackId="tokens" fill="#764ba2" name="Output" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
