import { useState, useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

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

export function TaskNotificationContent({ text }: { text: string }) {
  const parsed = useMemo(() => parseTaskNotification(text), [text])
  const [showResult, setShowResult] = useState(false)

  const mdClass = "prose prose-invert prose-base max-w-none min-w-0"

  if (!parsed) {
    return (
      <div className={mdClass}>
        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</Markdown>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {parsed.before && (
        <div className={`${mdClass} mb-1`}>
          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.before}</Markdown>
        </div>
      )}
      <div className={mdClass}>
        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.summary}</Markdown>
      </div>
      {parsed.result && (
        <>
          <button
            onClick={() => setShowResult(!showResult)}
            className="mt-1 text-base text-[var(--accent-cyan)] hover:underline cursor-pointer bg-transparent border-none p-0"
          >
            {showResult ? 'Hide details' : 'Show details'}
          </button>
          {showResult && (
            <div className={`${mdClass} mt-1 text-[var(--text-secondary)]`}>
              <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.result}</Markdown>
            </div>
          )}
        </>
      )}
      {parsed.after && !/Full transcript available at/i.test(parsed.after) && (
        <div className={`${mdClass} mt-1`}>
          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{parsed.after}</Markdown>
        </div>
      )}
    </div>
  )
}
