import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartCard } from './ChartCard'
import type { AdvancedToolStats } from '../../types'

const COLORS = ['#58a6ff', '#bc8cff', '#3fb950', '#d29922', '#667eea', '#764ba2', '#ef4444', '#f59e0b']

interface McpUsageChartProps {
  advancedTools: AdvancedToolStats
}

export function McpUsageChart({ advancedTools }: McpUsageChartProps) {
  const serverData = Object.entries(advancedTools.mcp_server_usage)

  if (serverData.length === 0) return null

  // Flatten: each bar = "server / tool" with count
  const data = serverData
    .flatMap(([server, tools]) =>
      Object.entries(tools).map(([tool, count]) => ({
        name: `${server} / ${tool}`,
        count,
      }))
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  if (data.length === 0) return null

  return (
    <ChartCard title="MCP Server Usage">
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={160}
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
