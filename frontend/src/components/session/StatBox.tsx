import { InfoTip } from '../ui'

interface StatBoxProps {
  label: string
  value: string
  info?: string
}

export function StatBox({ label, value, info }: StatBoxProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 relative">
      {info && (
        <div className="absolute top-1.5 right-1.5">
          <InfoTip text={info} />
        </div>
      )}
      <div className="text-[var(--text-secondary)] text-[13px] mb-1">{label}</div>
      <div className="text-[var(--text-bright)] font-mono text-base font-semibold">{value}</div>
    </div>
  )
}
