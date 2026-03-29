import type { ReactNode } from 'react'
import { InfoTip } from './InfoTip'

interface MetadataFieldProps {
  label: string
  info?: string
  children: ReactNode
}

export function MetadataField({ label, info, children }: MetadataFieldProps) {
  return (
    <div>
      <span className="text-[var(--text-secondary)] text-sm mb-1 flex items-center gap-1">
        {label}
        {info && <InfoTip text={info} />}
      </span>
      {children}
    </div>
  )
}
