import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface HeaderProps {
  children?: ReactNode
}

export function Header({ children }: HeaderProps) {
  const { pathname } = useLocation()

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/insights', label: 'Insights' },
  ]

  return (
    <header className="sticky top-0 z-20 bg-[var(--bg-primary)] border-b border-[var(--border)] px-8 py-3 max-sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3.5 hover:opacity-80 transition-opacity">
            <span className="text-[var(--accent-cyan)] text-[22px] leading-none">&#9670;</span>
            <span className="font-[var(--font-mono)] text-lg font-bold text-white tracking-wide">ClawLens</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const isActive = item.to === '/'
                ? pathname === '/'
                : pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        {children}
      </div>
    </header>
  )
}
