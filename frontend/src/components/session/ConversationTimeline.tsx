import { useState, useRef, useEffect } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import type { Turn } from '../../types'
import { LiveBadge, TypingDots } from '../StatusIndicator'
import { SectionTitle } from '../ui'
import { TurnCard } from './TurnCard'

const INITIAL_TURNS_SHOWN = 30

interface ConversationTimelineProps {
  turns: Turn[]
  isActive: boolean
  isWaiting: boolean
  showAll: boolean
  onShowAll: () => void
}

export function ConversationTimeline({ turns, isActive, isWaiting, showAll, onShowAll }: ConversationTimelineProps) {
  const visibleTurns = showAll ? turns : turns.slice(0, INITIAL_TURNS_SHOWN)
  const hasMore = turns.length > INITIAL_TURNS_SHOWN
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevTurnCountRef = useRef(turns.length)
  const [allExpanded, setAllExpanded] = useState(true)
  // Bump key to force TurnCard re-mount when toggling expand/collapse
  const [expandKey, setExpandKey] = useState(0)

  const toggleAll = () => {
    setAllExpanded((v) => !v)
    setExpandKey((k) => k + 1)
  }

  useEffect(() => {
    if (turns.length > prevTurnCountRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevTurnCountRef.current = turns.length
  }, [turns.length])

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionTitle className="gap-2">
          Conversation Timeline ({turns.length} turn{turns.length !== 1 ? 's' : ''})
          {isActive && <LiveBadge />}
        </SectionTitle>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors cursor-pointer"
          title={allExpanded ? 'Collapse all turns' : 'Expand all turns'}
        >
          {allExpanded ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
          <span>{allExpanded ? 'Collapse all' : 'Expand all'}</span>
        </button>
      </div>
      <div className="space-y-2">
        {visibleTurns.map((turn) => (
          <TurnCard key={`${turn.index}-${expandKey}`} turn={turn} isFirst={turn.index === 1} defaultExpanded={allExpanded} />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={onShowAll}
          className="mt-3 w-full py-2 text-base text-[var(--accent-cyan)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:bg-[rgba(88,166,255,0.1)] transition-colors cursor-pointer"
        >
          Show all {turns.length} turns ({turns.length - INITIAL_TURNS_SHOWN} more)
        </button>
      )}
      {isActive && <TypingDots isWaiting={isWaiting} />}
      <div ref={bottomRef} />
    </div>
  )
}
