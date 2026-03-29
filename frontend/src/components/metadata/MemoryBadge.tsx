import { Brain } from 'lucide-react'
import { Tooltip } from '@heroui/react'
import { ThemedChip } from '../ui'

interface MemoryBadgeProps {
  interactive?: boolean
  onClick?: () => void
  label?: string
}

export function MemoryBadge({ interactive, onClick, label = 'Memory' }: MemoryBadgeProps) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <ThemedChip color="magenta" interactive={interactive} onClick={onClick} className="text-sm">
          <Brain size={12} /> {label}
        </ThemedChip>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Tooltip.Arrow />
        This session uses memory files
      </Tooltip.Content>
    </Tooltip>
  )
}
