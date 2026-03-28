import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { Turn } from '../../types'
import { formatDuration } from '../../utils'
import { TaskNotificationContent } from './TaskNotificationContent'

interface TurnCardProps {
  turn: Turn
  isFirst?: boolean
  defaultExpanded?: boolean
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

export function TurnCard({ turn, isFirst, defaultExpanded }: TurnCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true)
  const ts = turn.timestamp ? new Date(turn.timestamp) : null
  const timeStr = ts && !isNaN(ts.getTime())
    ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <div className={`border rounded-lg px-4 py-3 ${isFirst ? 'bg-[rgba(88,166,255,0.08)] border-[rgba(88,166,255,0.3)]' : 'bg-[var(--bg-secondary)] border-[var(--border)]'}`}>
      <div
        className="flex items-center gap-2 flex-wrap cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-mono font-semibold shrink-0 ${isFirst ? 'bg-[rgba(88,166,255,0.25)] text-[var(--accent-cyan)]' : 'bg-[rgba(88,166,255,0.15)] text-[var(--accent-cyan)]'}`}>
          {turn.index}
        </span>
        {timeStr && (
          <span className="text-[var(--text-secondary)] text-xs font-mono">{timeStr}</span>
        )}
        {turn.durationMs > 0 && (
          <span className="text-[var(--text-secondary)] text-[11px] font-mono">
            {formatDuration(turn.durationMs)}
          </span>
        )}
        {expanded
          ? <ChevronUp size={14} className="text-[var(--text-secondary)] ml-auto shrink-0" />
          : <ChevronDown size={14} className="text-[var(--text-secondary)] ml-auto shrink-0" />
        }
      </div>

      {!expanded && (
        <div className="mt-2 text-sm text-[var(--text-primary)] font-mono whitespace-pre-line line-clamp-2">
          {getPreviewText(turn)}
        </div>
      )}

      {expanded && (
        <div className="mt-2">
          {turn.userPrompt && (
            <div className="text-sm text-[var(--text-primary)] mb-2 break-words">
              <TaskNotificationContent text={turn.userPrompt} />
            </div>
          )}

          {turn.events.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {turn.events.map((ev, i) =>
                ev.kind === 'tool' ? (
                  <div key={i} className="flex items-center gap-1.5 text-sm font-mono truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] shrink-0" />
                    <span className="text-[var(--text-primary)] font-bold shrink-0">{ev.toolName}</span>
                    {ev.toolDetail && (
                      <span className="text-[var(--text-secondary)] truncate">{ev.toolDetail}</span>
                    )}
                  </div>
                ) : (
                  <div key={i} className="flex gap-1.5 text-sm text-[var(--text-primary)] break-words">
                    <span className="flex items-center shrink-0 h-[1.5em] leading-[1.5em]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /></span>
                    <TaskNotificationContent text={ev.text} />
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
