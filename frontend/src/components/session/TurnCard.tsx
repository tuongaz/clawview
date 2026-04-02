import { useState } from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import type { Turn, UserImage } from '../../types'
import { TaskNotificationContent } from './TaskNotificationContent'

interface TurnCardProps {
  turn: Turn
  isFirst?: boolean
  defaultExpanded?: boolean
  showWorking?: boolean
  showWaiting?: boolean
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

function ImageThumbnail({ image }: { image: UserImage }) {
  const [modalOpen, setModalOpen] = useState(false)
  const src = `data:${image.mediaType};base64,${image.data}`

  return (
    <>
      <img
        src={src}
        alt="User attached image"
        className="max-h-[120px] rounded border border-[var(--border)] object-contain cursor-pointer hover:border-[var(--accent-cyan)] transition-colors"
        onClick={() => setModalOpen(true)}
      />
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setModalOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-3 -right-3 p-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer z-10"
              onClick={() => setModalOpen(false)}
            >
              <X size={16} />
            </button>
            <img
              src={src}
              alt="User attached image"
              className="max-w-[90vw] max-h-[90vh] rounded-lg border border-[var(--border)] object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}

function ToolInputDetail({ toolInput, toolExtra }: { toolInput: Record<string, unknown>; toolExtra: string }) {
  const [show, setShow] = useState(false)

  // Build entries from tool_input, filtering out keys already shown in toolDetail
  const entries = Object.entries(toolInput).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  )
  const hasContent = entries.length > 0 || toolExtra

  if (!hasContent) return null

  return (
    <>
      <button
        className="text-xs text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
        onClick={() => setShow(!show)}
      >
        {show ? 'hide' : 'view'}
      </button>
      {show && (
        <div className="basis-full ml-[calc(0.375rem+0.375rem)] pl-2 border-l border-[var(--border)] text-[13px] font-mono text-gray-500 break-all">
          {entries.length > 0 ? (
            <div className="flex flex-col gap-1">
              {entries.map(([key, value]) => {
                const strVal = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
                const isLong = strVal.length > 120 || strVal.includes('\n')
                return (
                  <div key={key}>
                    <span className="text-[var(--text-secondary)]">{key}: </span>
                    {isLong ? (
                      <pre className="mt-0.5 whitespace-pre-wrap text-gray-400 bg-[var(--bg-primary)] rounded px-2 py-1 overflow-x-auto">{strVal}</pre>
                    ) : (
                      <span className="text-gray-400">{strVal}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            toolExtra
          )}
        </div>
      )}
    </>
  )
}

export function TurnCard({ turn, isFirst, defaultExpanded, showWorking, showWaiting }: TurnCardProps) {
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
            <div className="pb-4 mb-4 border-b border-white/10 break-words">
              <div className="text-base text-white">
                <TaskNotificationContent text={turn.userPrompt} />
              </div>
              {turn.images && turn.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {turn.images.map((img, i) => (
                    <ImageThumbnail key={i} image={img} />
                  ))}
                </div>
              )}
            </div>
          )}

          {!turn.userPrompt && turn.images && turn.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {turn.images.map((img, i) => (
                <ImageThumbnail key={i} image={img} />
              ))}
            </div>
          )}

          {turn.events.length > 0 && (
            <div className="flex flex-col gap-3">
              {turn.events.map((ev, i) =>
                ev.kind === 'tool' ? (
                  <div key={i} className="flex flex-col">
                    <div className="flex items-baseline gap-1.5 text-base font-mono flex-wrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] shrink-0 self-center" />
                      <span className="text-[var(--text-primary)] font-bold shrink-0">{ev.toolName}</span>
                      {ev.toolDetail && (
                        <span className="text-[13px] text-[var(--text-secondary)] break-all">{ev.toolDetail}</span>
                      )}
                      {(ev.toolInput && Object.keys(ev.toolInput).length > 0 || ev.toolExtra) && (
                        <ToolInputDetail toolInput={ev.toolInput ?? {}} toolExtra={ev.toolExtra} />
                      )}
                    </div>
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
          {showWaiting && (
            <div className="mt-3 text-sm text-warning" style={{ animation: 'pulse-blink 2s ease-in-out infinite' }}>
              Waiting for user input…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
