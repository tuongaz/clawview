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

interface CommandComplexityChartProps {
  commandDetails: CommandDetail[]
}

export function CommandComplexityChart({ commandDetails }: CommandComplexityChartProps) {
  const buckets = bucketCommands(commandDetails)
  if (buckets.length === 0) return null

  let totalCmds = 0
  let totalTools = 0
  let totalSteps = 0

  const data = buckets.map((b) => {
    for (const cmd of b.commands) {
      totalCmds++
      totalTools += cmd.tools_count
      totalSteps += cmd.steps
    }
    return {
      label: b.label,
      avgTools: totalCmds > 0 ? +(totalTools / totalCmds).toFixed(2) : 0,
      avgSteps: totalCmds > 0 ? +(totalSteps / totalCmds).toFixed(2) : 0,
    }
  })

  return (
    <ChartCard title="Command Complexity Over Time">
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
            type="monotone"
            dataKey="avgTools"
            name="avg tools/cmd"
            stroke="#667eea"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="avgSteps"
            name="avg steps/cmd"
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
