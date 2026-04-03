import { useState, useMemo } from 'react'
import { Users, ChevronDown, ChevronRight } from 'lucide-react'
import { MarkdownRenderer } from '../ui'

function parseTaskNotification(text: string): { before: string; summary: string; result: string; after: string } | null {
  const tnMatch = text.match(/<task-notification>([\s\S]*?)<\/task-notification>/)
  if (!tnMatch) return null
  const inner = tnMatch[1]
  const summaryMatch = inner.match(/<summary>([\s\S]*?)<\/summary>/)
  const resultMatch = inner.match(/<result>([\s\S]*?)<\/result>/)
  if (!summaryMatch) return null
  const before = text.slice(0, tnMatch.index!)
  const after = text.slice(tnMatch.index! + tnMatch[0].length)
  return {
    before: before.trim(),
    summary: summaryMatch[1].trim(),
    result: resultMatch ? resultMatch[1].trim() : '',
    after: after.trim(),
  }
}

interface TeammateMessage {
  teammateId: string
  color: string
  summary: string
  content: string
}

type TeammateSegment = { kind: 'text'; text: string } | { kind: 'teammate'; msg: TeammateMessage }

function parseTeammateMessages(text: string): TeammateSegment[] | null {
  const pattern = /<teammate-message\s+([^>]*)>([\s\S]*?)<\/teammate-message>/g
  let match: RegExpExecArray | null
  const segments: TeammateSegment[] = []
  let lastIndex = 0

  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim()
    if (before && !/Full transcript available at/i.test(before)) {
      segments.push({ kind: 'text', text: before })
    }

    const attrs = match[1]
    const content = match[2].trim()
    const idMatch = attrs.match(/teammate_id="([^"]*)"/)
    const colorMatch = attrs.match(/color="([^"]*)"/)
    const summaryMatch = attrs.match(/summary="([^"]*)"/)

    segments.push({
      kind: 'teammate',
      msg: {
        teammateId: idMatch ? idMatch[1] : '',
        color: colorMatch ? colorMatch[1] : '',
        summary: summaryMatch ? summaryMatch[1] : '',
        content,
      },
    })
    lastIndex = match.index + match[0].length
  }

  if (segments.length === 0) return null

  const after = text.slice(lastIndex).trim()
  if (after && !/Full transcript available at/i.test(after)) {
    segments.push({ kind: 'text', text: after })
  }

  return segments
}

const TEAMMATE_COLORS: Record<string, string> = {
  blue: 'var(--accent-cyan)',
  green: 'var(--accent-green)',
  yellow: 'var(--accent-yellow)',
  red: 'var(--accent-red)',
  magenta: 'var(--accent-magenta)',
}

function TeammateMessageBlock({ msg, onTeammateClick }: { msg: TeammateMessage; onTeammateClick?: (teammateId: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const accentColor = TEAMMATE_COLORS[msg.color] || 'var(--accent-green)'
  const mdClass = "prose prose-invert prose-base max-w-none min-w-0"

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {onTeammateClick ? (
          <button
            onClick={(e) => { e.stopPropagation(); onTeammateClick(msg.teammateId) }}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer hover:underline transition-colors"
          >
            <Users size={14} style={{ color: accentColor }} className="shrink-0" />
            <span className="font-semibold text-sm" style={{ color: accentColor }}>{msg.teammateId}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: accentColor }} className="shrink-0" />
            <span className="font-semibold text-sm" style={{ color: accentColor }}>{msg.teammateId}</span>
          </div>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2 bg-transparent border-none cursor-pointer hover:bg-white/5 transition-colors text-left min-w-0"
        >
          {msg.summary && (
            <>
              <span className="text-[var(--text-secondary)] text-sm">&mdash;</span>
              <span className="text-sm text-[var(--text-primary)] truncate">{msg.summary}</span>
            </>
          )}
          {!msg.summary && msg.content && (
            <>
              <span className="text-[var(--text-secondary)] text-sm">&mdash;</span>
              <span className="text-sm text-[var(--text-secondary)] truncate">{msg.content.slice(0, 80)}{msg.content.length > 80 ? '...' : ''}</span>
            </>
          )}
          <span className="ml-auto shrink-0 text-[var(--text-secondary)]">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>
      </div>

      {/* Content */}
      {expanded && msg.content && (
        <div
          className="px-3 py-2 border-t"
          style={{ borderColor: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
        >
          <MarkdownRenderer className={mdClass}>{msg.content}</MarkdownRenderer>
        </div>
      )}
    </div>
  )
}

export function TaskNotificationContent({ text, onTeammateClick }: { text: string; onTeammateClick?: (teammateId: string) => void }) {
  const taskParsed = useMemo(() => parseTaskNotification(text), [text])
  const teammateSegments = useMemo(() => parseTeammateMessages(text), [text])
  const [showResult, setShowResult] = useState(false)

  const mdClass = "prose prose-invert prose-base max-w-none min-w-0"

  // Teammate messages (one or more)
  if (teammateSegments) {
    return (
      <div className="min-w-0 space-y-2">
        {teammateSegments.map((seg, i) =>
          seg.kind === 'text' ? (
            <MarkdownRenderer key={i} className={mdClass}>{seg.text}</MarkdownRenderer>
          ) : (
            <TeammateMessageBlock key={i} msg={seg.msg} onTeammateClick={onTeammateClick} />
          )
        )}
      </div>
    )
  }

  // Task notification
  if (taskParsed) {
    return (
      <div className="min-w-0">
        {taskParsed.before && (
          <MarkdownRenderer className={`${mdClass} mb-1`}>{taskParsed.before}</MarkdownRenderer>
        )}
        <MarkdownRenderer className={mdClass}>{taskParsed.summary}</MarkdownRenderer>
        {taskParsed.result && (
          <>
            <button
              onClick={() => setShowResult(!showResult)}
              className="mt-1 text-base text-[var(--accent-cyan)] hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              {showResult ? 'Hide details' : 'Show details'}
            </button>
            {showResult && (
              <MarkdownRenderer className={`${mdClass} mt-1 text-[var(--text-secondary)]`}>{taskParsed.result}</MarkdownRenderer>
            )}
          </>
        )}
        {taskParsed.after && !/Full transcript available at/i.test(taskParsed.after) && (
          <MarkdownRenderer className={`${mdClass} mt-1`}>{taskParsed.after}</MarkdownRenderer>
        )}
      </div>
    )
  }

  // Plain text
  return (
    <MarkdownRenderer className={mdClass}>{text}</MarkdownRenderer>
  )
}
