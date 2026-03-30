import { useState, useRef, useEffect } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { Popover } from '@heroui/react'
import type { Turn } from '../../types'
import { SectionTitle } from '../ui'
import { TurnCard } from './TurnCard'
import { formatDuration, formatTokens } from '../../utils'

const INITIAL_TURNS_SHOWN = 30

interface ConversationTimelineProps {
  turns: Turn[]
  isActive: boolean
  showAll: boolean
  onShowAll: () => void
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ConversationTimeline({ turns, isActive, showAll, onShowAll }: ConversationTimelineProps) {
  const visibleTurns = showAll ? turns : turns.slice(0, INITIAL_TURNS_SHOWN)
  const hasMore = turns.length > INITIAL_TURNS_SHOWN
  const firstTimestamp = turns.length > 0 ? new Date(turns[0].timestamp).getTime() : 0
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevTurnCountRef = useRef(turns.length)
  const [allExpanded, setAllExpanded] = useState(true)
  // Bump key to force TurnCard re-mount when toggling expand/collapse
  const [expandKey, setExpandKey] = useState(0)
  const [activeTurnIndex, setActiveTurnIndex] = useState<number | null>(null)
  const visibleMapRef = useRef<Map<number, DOMRectReadOnly>>(new Map())

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

  // Track which turn is currently in view
  useEffect(() => {
    const intersectionCb: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        const idx = Number(entry.target.getAttribute('data-turn-index'))
        if (isNaN(idx)) continue
        if (entry.isIntersecting) {
          visibleMapRef.current.set(idx, entry.boundingClientRect)
        } else {
          visibleMapRef.current.delete(idx)
        }
      }
      if (visibleMapRef.current.size > 0) {
        const topmost = [...visibleMapRef.current.entries()]
          .sort((a, b) => a[1].top - b[1].top)[0][0]
        setActiveTurnIndex(topmost)
      }
    }

    let io = new IntersectionObserver(intersectionCb, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0.1,
    })

    const observedSet = new Set<Element>()

    const attach = () => {
      const els = document.querySelectorAll<HTMLElement>('[data-turn-index]')
      els.forEach((el) => {
        if (!observedSet.has(el)) {
          observedSet.add(el)
          io.observe(el)
        }
      })
    }

    attach()

    const mo = new MutationObserver(() => {
      io.disconnect()
      observedSet.clear()
      visibleMapRef.current.clear()
      io = new IntersectionObserver(intersectionCb, {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0.1,
      })
      attach()
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [turns])

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionTitle className="gap-2">
          Conversation Timeline ({turns.length} turn{turns.length !== 1 ? 's' : ''})
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
      <div className="space-y-5">
        {visibleTurns.map((turn, i) => {
          const isLast = i === visibleTurns.length - 1
          const showPulse = isActive && isLast
          const isCurrent = activeTurnIndex === turn.index
          return (
            <div key={`${turn.index}-${expandKey}`} className="flex gap-6">
              {/* Timeline column */}
              <div className="flex flex-col items-center shrink-0">
                <div className="sticky top-[60px] z-10 pt-3 flex flex-col items-center">
                <div className={`text-[11px] font-mono whitespace-nowrap mb-1 transition-colors ${isCurrent ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'}`}>
                  {(() => {
                    const ts = turn.timestamp ? new Date(turn.timestamp) : null
                    return ts && !isNaN(ts.getTime())
                      ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : ''
                  })()}
                </div>
                <Popover>
                  <Popover.Trigger>
                    <button className="relative cursor-default">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold transition-all
                          ${isCurrent
                            ? 'bg-[var(--accent-cyan)] text-[var(--bg-primary)] scale-110'
                            : 'bg-[rgba(88,166,255,0.15)] text-[var(--text-secondary)]'
                          }
                          ${showPulse ? 'animate-pulse' : ''}`}
                      >
                        {turn.index}
                      </div>
                      {showPulse && (
                        <div className="absolute inset-0 w-7 h-7 rounded-full bg-[var(--accent-cyan)] animate-ping opacity-30" />
                      )}
                    </button>
                  </Popover.Trigger>
                  <Popover.Content>
                    <Popover.Dialog>
                      <Popover.Arrow />
                      <div className="whitespace-nowrap text-[12px] font-mono space-y-1">
                        <div className="text-[var(--text-bright)] font-semibold mb-1.5">Turn {turn.index}</div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">Started</span>
                          <span className="text-[var(--text-primary)]">{formatTime(turn.timestamp)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">Completed</span>
                          <span className="text-[var(--text-primary)]">
                            {turn.durationMs > 0
                              ? formatTime(new Date(new Date(turn.timestamp).getTime() + turn.durationMs).toISOString())
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">Duration</span>
                          <span className="text-[var(--text-primary)]">{turn.durationMs > 0 ? formatDuration(turn.durationMs) : '—'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">From start</span>
                          <span className="text-[var(--accent-cyan)]">{formatDuration(new Date(turn.timestamp).getTime() - firstTimestamp)}</span>
                        </div>
                        {(turn.usage.inputTokens > 0 || turn.usage.outputTokens > 0) && (
                          <div className="border-t border-[var(--border)] pt-1 mt-1 space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-secondary)]">In</span>
                              <span className="text-[var(--text-primary)]">{formatTokens(turn.usage.inputTokens)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-secondary)]">Out</span>
                              <span className="text-[var(--text-primary)]">{formatTokens(turn.usage.outputTokens)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Popover.Dialog>
                  </Popover.Content>
                </Popover>
                {turn.durationMs > 0 && (
                  <div className={`text-[10px] font-mono mt-0.5 transition-colors ${isCurrent ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'}`}>
                    {formatDuration(turn.durationMs)}
                  </div>
                )}
                </div>
              </div>
              {/* Turn card */}
              <div className="flex-1 min-w-0 pb-2">
                <TurnCard turn={turn} isFirst={turn.index === 1} defaultExpanded={allExpanded} showWorking={isActive && isLast && (Date.now() - new Date(turn.timestamp).getTime()) < 5 * 60 * 1000} />
              </div>
            </div>
          )
        })}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={onShowAll}
          className="mt-3 w-full py-2 text-base text-[var(--accent-cyan)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:bg-[rgba(88,166,255,0.1)] transition-colors cursor-pointer"
        >
          Show all {turns.length} turns ({turns.length - INITIAL_TURNS_SHOWN} more)
        </button>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
