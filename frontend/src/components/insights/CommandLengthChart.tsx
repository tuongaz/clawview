import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartCard } from './ChartCard'
import { bucketCommands } from './dynamicInterval'
import type { CommandDetail } from '../../types'

interface CommandLengthChartProps {
  commandDetails: CommandDetail[]
}

export function CommandLengthChart({ commandDetails }: CommandLengthChartProps) {
  const buckets = bucketCommands(commandDetails)
  if (buckets.length === 0) return null

  let totalCmds = 0
  let totalTokens = 0

  const data = buckets.map((b) => {
    for (const cmd of b.commands) {
      totalCmds++
      totalTokens += cmd.tokens
    }
    return {
      label: b.label,
      avgTokens: totalCmds > 0 ? Math.round(totalTokens / totalCmds) : 0,
    }
  })

  return (
    <ChartCard title="Command Length Over Time">
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
            tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 15,
            }}
            labelStyle={{ color: 'var(--text-bright)' }}
            formatter={(value) => value != null ? [`${Number(value).toLocaleString()} tokens`, 'avg tokens/cmd'] : ''}
          />
          <Line
            type="monotone"
            dataKey="avgTokens"
            name="avg tokens/cmd"
            stroke="#764ba2"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
