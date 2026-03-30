import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { Turn } from '../../types'
import { TaskNotificationContent } from './TaskNotificationContent'

interface TurnCardProps {
  turn: Turn
  isFirst?: boolean
  defaultExpanded?: boolean
  showWorking?: boolean
}

function getPreviewText(turn: Turn): string {
  const lines: string[] = []
  if (turn.userPrompt) {
    lines.push(...turn.userPrompt.split('\n').filter((l) => l.trim()))
  }
  for (const ev of turn.events) {
    if (lines.length >= 2) break
    if (ev.kind === 'tool') {
      lines.push(`${ev.toolName}${ev.toolDetail ? ' ' + ev.toolDetail : ''}`)
    } else {
      lines.push(...ev.text.split('\n').filter((l) => l.trim()))
    }
  }
  const preview = lines.slice(0, 2).join('\n')
  const hasMore = lines.length > 2 || turn.events.length > 0
  return hasMore ? preview + ' …' : preview
}

export function TurnCard({ turn, isFirst, defaultExpanded, showWorking }: TurnCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true)

  return (
    <div id={`turn-${turn.index}`} data-turn-index={turn.index} className={`relative border rounded-lg px-4 py-3 scroll-mt-[100px] ${isFirst ? 'bg-[rgba(88,166,255,0.08)] border-[rgba(88,166,255,0.3)]' : 'bg-[var(--bg-secondary)] border-[var(--border)]'}`}>
      <button
        className="absolute top-2 right-2 p-1 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors cursor-pointer z-10"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronUp size={14} />
          : <ChevronDown size={14} />
        }
      </button>

      {!expanded && (
        <div className="text-base text-[var(--text-primary)] font-mono whitespace-pre-line line-clamp-2 pr-6">
          {getPreviewText(turn)}
        </div>
      )}

      {expanded && (
        <div>
          {turn.userPrompt && (
            <div className="text-base text-[var(--text-primary)] mb-2 break-words">
              <TaskNotificationContent text={turn.userPrompt} />
            </div>
          )}

          {turn.events.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {turn.events.map((ev, i) =>
                ev.kind === 'tool' ? (
                  <div key={i} className="flex items-center gap-1.5 text-base font-mono truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] shrink-0" />
                    <span className="text-[var(--text-primary)] font-bold shrink-0">{ev.toolName}</span>
                    {ev.toolDetail && (
                      <span className="text-[var(--text-secondary)] truncate">{ev.toolDetail}</span>
                    )}
                  </div>
                ) : (
                  <div key={i} className="flex gap-1.5 text-base text-[var(--text-primary)] break-words">
                    <span className="flex items-center shrink-0 h-[1.5em] leading-[1.5em]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /></span>
                    <TaskNotificationContent text={ev.text} />
                  </div>
                )
              )}
            </div>
          )}

          {showWorking && (
            <div className="mt-3 flex items-center gap-2 text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" style={{ animation: 'dot-blink 1.4s ease-in-out infinite' }} />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" style={{ animation: 'dot-blink 1.4s ease-in-out 0.2s infinite' }} />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" style={{ animation: 'dot-blink 1.4s ease-in-out 0.4s infinite' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
