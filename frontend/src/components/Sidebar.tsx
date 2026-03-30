import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SidebarProps {
  onClose: () => void
  icon: ReactNode
  title: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function Sidebar({ onClose, icon, title, footer, children }: SidebarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[640px] max-w-[90vw] bg-[var(--bg-primary)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl shadow-black/40 animate-slide-in">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border)] shrink-0">
          {icon}
          <h2 className="text-base font-semibold text-[var(--text-bright)] flex-1 truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-[var(--border)] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
