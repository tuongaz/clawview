import { Chip, Tooltip } from '@heroui/react'
import { GitBranchIcon } from '../../utils'

interface GitBranchBadgeProps {
  branch: string
}

export function GitBranchBadge({ branch }: GitBranchBadgeProps) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Chip size="sm" variant="secondary" className="bg-transparent border-0 text-[var(--text-secondary)] font-mono text-[13px] px-0 gap-1 max-w-[200px]">
          <GitBranchIcon />
          <span className="truncate">{branch}</span>
        </Chip>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Tooltip.Arrow />
        Branch: {branch}
      </Tooltip.Content>
    </Tooltip>
  )
}
