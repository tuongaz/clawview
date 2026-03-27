import { useParams, Link } from 'react-router-dom'

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  return (
    <div className="w-full px-8 py-6 max-sm:px-4 max-sm:py-4">
      <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-xl font-semibold mt-4 text-[var(--text-primary)]">
        Session {sessionId?.slice(0, 8)}
      </h1>
      <p className="text-[var(--text-secondary)] text-sm mt-2">Detail page coming soon.</p>
    </div>
  )
}
