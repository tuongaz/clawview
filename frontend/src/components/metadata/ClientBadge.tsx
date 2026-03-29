import { Tooltip } from '@heroui/react'
import { ThemedChip } from '../ui'
import { getClientIcon, ideDeepLink } from '../../utils'

interface ClientBadgeProps {
  client: string
  projectPath: string
}

export function ClientBadge({ client, projectPath }: ClientBadgeProps) {
  const link = ideDeepLink(client, projectPath)

  const chip = (
    <ThemedChip color="cyan" interactive={!!link} className="text-sm">
      {getClientIcon(client)} {client}
    </ThemedChip>
  )

  return (
    <Tooltip>
      <Tooltip.Trigger>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
            onClick={(e) => e.stopPropagation()}
          >
            {chip}
          </a>
        ) : (
          chip
        )}
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Tooltip.Arrow />
        {link ? `Open in ${client}` : client}
      </Tooltip.Content>
    </Tooltip>
  )
}
