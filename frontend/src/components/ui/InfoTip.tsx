import { Info } from 'lucide-react'
import { Popover } from '@heroui/react'

interface InfoTipProps {
  text: string
}

export function InfoTip({ text }: InfoTipProps) {
  return (
    <Popover>
      <Popover.Trigger>
        <button type="button" className="inline-flex items-center cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-none p-0">
          <Info size={14} />
        </button>
      </Popover.Trigger>
      <Popover.Content className="max-w-[220px]">
        <Popover.Dialog>
          <Popover.Arrow />
          <p className="text-base text-[var(--text-primary)] leading-relaxed">{text}</p>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
