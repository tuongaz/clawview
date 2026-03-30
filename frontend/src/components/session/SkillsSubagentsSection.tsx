import { Link } from 'react-router-dom'
import { SectionCard, SectionTitle, ThemedChip, InfoTip } from '../ui'

interface SkillsSubagentsSectionProps {
  sessionId: string
  commandsUsed: string[]
  skillsUsed: string[]
  subagentsUsed: string[]
}

/** Strip leading "/" from a command name to get the skill lookup key. */
function commandToSkillName(cmd: string): string {
  return cmd.startsWith('/') ? cmd.slice(1) : cmd
}

export function SkillsSubagentsSection({ sessionId, commandsUsed, skillsUsed, subagentsUsed }: SkillsSubagentsSectionProps) {
  const hasCommands = commandsUsed && commandsUsed.length > 0
  const hasSkills = skillsUsed && skillsUsed.length > 0
  const hasSubagents = subagentsUsed && subagentsUsed.length > 0
  if (!hasCommands && !hasSkills && !hasSubagents) return null

  return (
    <SectionCard className="space-y-3">
      {hasCommands && (
        <div>
          <SectionTitle className="mb-2">Commands <InfoTip text="Slash commands (e.g. /commit, /review) invoked during this session. Click to view the skill definition." /></SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {commandsUsed.map((c) => (
              <Link key={c} to={`/session/${sessionId}/skills/${encodeURIComponent(commandToSkillName(c))}`}>
                <ThemedChip color="cyan" interactive>{c}</ThemedChip>
              </Link>
            ))}
          </div>
        </div>
      )}
      {hasSkills && (
        <div>
          <SectionTitle className="mb-2">Skills <InfoTip text="Specialized skill prompts that were loaded and executed. Click to view content." /></SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {skillsUsed.map((s) => (
              <Link key={s} to={`/session/${sessionId}/skills/${encodeURIComponent(s)}`}>
                <ThemedChip color="yellow" interactive>{s}</ThemedChip>
              </Link>
            ))}
          </div>
        </div>
      )}
      {hasSubagents && (
        <div>
          <SectionTitle className="mb-2">Subagents <InfoTip text="Autonomous sub-agents spawned to handle parallel or specialized tasks." /></SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {subagentsUsed.map((s) => (
              <ThemedChip key={s} color="green">{s}</ThemedChip>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}
