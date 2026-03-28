import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartCard } from './ChartCard'
import type { AdvancedToolStats } from '../../types'

const AGENT_COLORS = ['#667eea', '#764ba2', '#48bb78', '#ef4444', '#f59e0b', '#ed8936', '#58a6ff', '#bc8cff']
const SKILL_COLORS = ['#3fb950', '#d29922', '#58a6ff', '#ef4444', '#667eea', '#764ba2', '#ed8936', '#bc8cff']

interface SubAgentSkillChartProps {
  advancedTools: AdvancedToolStats
}

export function SubAgentSkillChart({ advancedTools }: SubAgentSkillChartProps) {
  const agentData = Object.entries(advancedTools.subagent_usage)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  const skillData = Object.entries(advancedTools.skill_usage)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  if (agentData.length === 0 && skillData.length === 0) return null

  return (
    <ChartCard title="SubAgents & Skills">
      <div className="space-y-4">
        {agentData.length > 0 && (
          <div>
            <div className="text-[var(--text-secondary)] text-[11px] mb-2 font-medium">SubAgent Types</div>
            <ResponsiveContainer width="100%" height={Math.max(120, agentData.length * 28)}>
              <BarChart data={agentData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-bright)' }}
                  itemStyle={{ color: 'var(--text-secondary)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {agentData.map((_, i) => (
                    <Cell key={i} fill={AGENT_COLORS[i % AGENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {skillData.length > 0 && (
          <div>
            <div className="text-[var(--text-secondary)] text-[11px] mb-2 font-medium">Skills / Commands</div>
            <ResponsiveContainer width="100%" height={Math.max(120, skillData.length * 28)}>
              <BarChart data={skillData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-bright)' }}
                  itemStyle={{ color: 'var(--text-secondary)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {skillData.map((_, i) => (
                    <Cell key={i} fill={SKILL_COLORS[i % SKILL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ChartCard>
  )
}
