import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-[var(--text-bright)] mb-3">Something went wrong</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-mono text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] rounded-lg hover:bg-[rgba(88,166,255,0.2)] transition-colors cursor-pointer"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
