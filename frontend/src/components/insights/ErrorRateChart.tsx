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
import { bucketCommandsAndErrors } from './dynamicInterval'
import type { CommandDetail, ErrorDetail } from '../../types'

interface ErrorRateChartProps {
  commandDetails: CommandDetail[]
  errorDetails: ErrorDetail[]
}

export function ErrorRateChart({ commandDetails, errorDetails }: ErrorRateChartProps) {
  const buckets = bucketCommandsAndErrors(commandDetails, errorDetails)
  if (buckets.length === 0) return null

  let totalCommands = 0
  let totalErrors = 0

  const data = buckets.map((b) => {
    totalCommands += b.commandCount
    totalErrors += b.errorCount
    return {
      label: b.label,
      rate: totalCommands > 0 ? +((totalErrors / totalCommands) * 100).toFixed(1) : 0,
      errors: totalErrors,
      commands: totalCommands,
    }
  })

  return (
    <ChartCard title="Error Rate Over Time">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="pct"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            unit="%"
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--text-bright)' }}
            itemStyle={{ color: 'var(--text-secondary)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="rate"
            name="rate %"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="errors"
            name="errors"
            stroke="#ed8936"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="commands"
            name="assistant messages"
            stroke="#667eea"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
