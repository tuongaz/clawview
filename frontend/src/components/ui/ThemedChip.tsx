import { Chip } from '@heroui/react'
import type { ReactNode } from 'react'

const colorStyles = {
  cyan: {
    text: 'text-[var(--accent-cyan)]',
    bg: 'bg-[rgba(88,166,255,0.1)]',
    border: 'border-[rgba(88,166,255,0.2)]',
    hoverBg: 'hover:bg-[rgba(88,166,255,0.2)]',
    hoverBorder: 'hover:border-[rgba(88,166,255,0.4)]',
  },
  magenta: {
    text: 'text-[var(--accent-magenta)]',
    bg: 'bg-[rgba(188,140,255,0.1)]',
    border: 'border-[rgba(188,140,255,0.2)]',
    hoverBg: 'hover:bg-[rgba(188,140,255,0.2)]',
    hoverBorder: 'hover:border-[rgba(188,140,255,0.4)]',
  },
  yellow: {
    text: 'text-[var(--accent-yellow)]',
    bg: 'bg-[rgba(210,153,34,0.1)]',
    border: 'border-[rgba(210,153,34,0.2)]',
    hoverBg: 'hover:bg-[rgba(210,153,34,0.2)]',
    hoverBorder: 'hover:border-[rgba(210,153,34,0.4)]',
  },
  green: {
    text: 'text-[var(--accent-green)]',
    bg: 'bg-[rgba(63,185,80,0.1)]',
    border: 'border-[rgba(63,185,80,0.2)]',
    hoverBg: 'hover:bg-[rgba(63,185,80,0.2)]',
    hoverBorder: 'hover:border-[rgba(63,185,80,0.4)]',
  },
} as const

export type ChipColor = keyof typeof colorStyles

interface ThemedChipProps {
  color: ChipColor
  children: ReactNode
  className?: string
  interactive?: boolean
  onClick?: () => void
}

export function ThemedChip({ color, children, className = '', interactive, onClick }: ThemedChipProps) {
  const s = colorStyles[color]
  const hover = interactive ? `${s.hoverBg} ${s.hoverBorder} transition-all cursor-pointer` : ''
  return (
    <Chip
      size="sm"
      variant="soft"
      className={`font-mono text-sm ${s.text} ${s.bg} border ${s.border} gap-1 ${hover} ${className}`}
      onClick={onClick}
    >
      {children}
    </Chip>
  )
}
