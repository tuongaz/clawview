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
          <span className="text-[var(--accent-cyan)] text-3xl leading-none">&#9670;</span>
          <span className="font-[var(--font-mono)] text-xl font-bold text-white tracking-wide">ClawLens</span>
        </Link>
        {children}
      </div>
    </header>
  )
}
