import { useState, useRef, useEffect } from 'react'
import type { Turn } from '../../types'
import { LiveBadge, TypingDots } from '../StatusIndicator'
import { SectionTitle } from '../ui'
import { TurnCard } from './TurnCard'

const INITIAL_TURNS_SHOWN = 30

interface ConversationTimelineProps {
  turns: Turn[]
  isActive: boolean
  isWaiting: boolean
}

export function ConversationTimeline({ turns, isActive, isWaiting }: ConversationTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  const visibleTurns = showAll ? turns : turns.slice(0, INITIAL_TURNS_SHOWN)
  const hasMore = turns.length > INITIAL_TURNS_SHOWN
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevTurnCountRef = useRef(turns.length)

  useEffect(() => {
    if (turns.length > prevTurnCountRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevTurnCountRef.current = turns.length
  }, [turns.length])

  return (
    <div>
      <SectionTitle className="gap-2">
        Conversation Timeline ({turns.length} turn{turns.length !== 1 ? 's' : ''})
        {isActive && <LiveBadge />}
      </SectionTitle>
      <div className="space-y-2">
        {visibleTurns.map((turn) => (
          <TurnCard key={turn.index} turn={turn} isFirst={turn.index === 1} />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 w-full py-2 text-sm text-[var(--accent-cyan)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:bg-[rgba(88,166,255,0.1)] transition-colors cursor-pointer"
        >
          Show all {turns.length} turns ({turns.length - INITIAL_TURNS_SHOWN} more)
        </button>
      )}
      {isActive && <TypingDots isWaiting={isWaiting} />}
      <div ref={bottomRef} />
    </div>
  )
}
