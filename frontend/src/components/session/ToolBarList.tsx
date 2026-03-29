interface ToolBarListProps {
  items: [string, number][]
  color: string
}

export function ToolBarList({ items, color }: ToolBarListProps) {
  const max = Math.max(...items.map(([, c]) => c))
  return (
    <div className="space-y-1.5">
      {items.map(([name, count]) => (
        <div key={name} className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-primary)] font-mono w-[140px] truncate shrink-0" title={name}>
            {name}
          </span>
          <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.max((count / max) * 100, 2)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-sm text-[var(--text-secondary)] font-mono w-8 text-right shrink-0">{count}</span>
        </div>
      ))}
    </div>
  )
}
