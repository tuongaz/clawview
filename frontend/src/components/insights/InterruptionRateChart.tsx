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

interface InterruptionRateChartProps {
  commandDetails: CommandDetail[]
}

export function InterruptionRateChart({ commandDetails }: InterruptionRateChartProps) {
  const buckets = bucketCommands(commandDetails, { includeInterrupted: true })
  if (buckets.length === 0) return null

  let totalCmds = 0
  let totalInterrupted = 0

  const data = buckets.map((b) => {
    for (const cmd of b.commands) {
      totalCmds++
      if (cmd.interrupted) totalInterrupted++
    }
    return {
      label: b.label,
      rate: totalCmds > 0 ? +((totalInterrupted / totalCmds) * 100).toFixed(1) : 0,
      commands: totalCmds,
      interrupted: totalInterrupted,
    }
  })

  return (
    <ChartCard title="Interruption Rate Over Time">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="pct"
            tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            unit="%"
          />
          <YAxis
            yAxisId="count"
            orientation="right"
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
          <Legend wrapperStyle={{ fontSize: 14 }} />
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
            dataKey="commands"
            name="commands"
            stroke="#667eea"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="interrupted"
            name="interrupted"
            stroke="#ed8936"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
