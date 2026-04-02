import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface HeaderProps {
  children?: ReactNode
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--bg-primary)] border-b border-[var(--border)] px-8 py-3 max-sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3.5 hover:opacity-80 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="10" cy="10" r="6" fill="#3fb950" opacity="0.85" />
            <circle cx="16" cy="10" r="6" fill="#eab308" opacity="0.85" />
            <circle cx="13" cy="16" r="6" fill="#6b7280" opacity="0.7" />
          </svg>
          <span className="font-[var(--font-mono)] text-xl font-bold text-white tracking-wide">ClawView</span>
        </Link>
        {children}
      </div>
    </header>
  )
}
