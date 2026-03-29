import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
      <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  )
}
