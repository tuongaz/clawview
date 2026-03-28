import { Link } from 'react-router-dom'
import { Header } from '../components/Header'

export function NotFoundPage() {
  return (
    <div className="w-full min-h-screen">
      <Header />
      <div className="flex flex-col items-center justify-center py-20 px-8">
        <span className="text-6xl font-mono font-bold text-[var(--text-secondary)] mb-4">404</span>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Page not found</p>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-mono text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] rounded-lg hover:bg-[rgba(88,166,255,0.2)] transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
