import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleSection({ title, children, defaultOpen = true, className = '' }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [children])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-1.5 text-left group cursor-pointer"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      <div
        style={{ maxHeight: open ? height ?? 9999 : 0 }}
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
      >
        <div ref={contentRef} className="pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}
