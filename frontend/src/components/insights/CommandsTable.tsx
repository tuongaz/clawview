import { useMemo, useState } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CommandDetail } from '../../types'

type SortKey = 'timestamp' | 'model' | 'steps' | 'tools_count' | 'tokens' | 'interrupted'
type SortDir = 'asc' | 'desc'
type InterruptFilter = 'all' | 'interrupted' | 'not_interrupted'

const PAGE_SIZE = 25

function shortenModel(m: string): string {
  return m.replace(/^claude-/, '').replace(/-\d{8}$/, '')
}

function fmtTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

interface CommandsTableProps {
  commandDetails: CommandDetail[]
}

export function CommandsTable({ commandDetails }: CommandsTableProps) {
  const [search, setSearch] = useState('')
  const [interruptFilter, setInterruptFilter] = useState<InterruptFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const filtered = useMemo(() => {
    let rows = commandDetails
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r => r.user_message.toLowerCase().includes(q))
    }
    if (interruptFilter === 'interrupted') rows = rows.filter(r => r.interrupted)
    if (interruptFilter === 'not_interrupted') rows = rows.filter(r => !r.interrupted)
    return rows
  }, [commandDetails, search, interruptFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'timestamp': cmp = a.timestamp.localeCompare(b.timestamp); break
        case 'model': cmp = a.model.localeCompare(b.model); break
        case 'steps': cmp = a.steps - b.steps; break
        case 'tools_count': cmp = a.tools_count - b.tools_count; break
        case 'tokens': cmp = a.tokens - b.tokens; break
        case 'interrupted': cmp = Number(a.interrupted) - Number(b.interrupted); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'timestamp' ? 'desc' : 'desc')
    }
    setPage(0)
  }

  function handleFilterChange(f: InterruptFilter) {
    setInterruptFilter(f)
    setPage(0)
    setExpandedIdx(null)
  }

  function handleSearchChange(v: string) {
    setSearch(v)
    setPage(0)
    setExpandedIdx(null)
  }

  if (commandDetails.length === 0) return null

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown size={12} className="opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="opacity-80" />
      : <ChevronDown size={12} className="opacity-80" />
  }

  const thClass = 'px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] cursor-pointer select-none whitespace-nowrap hover:text-[var(--text-primary)] transition-colors'

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-[var(--text-secondary)] text-base font-medium mb-3">Command Details</h3>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-60" />
            <input
              type="text"
              placeholder="Search commands…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-base font-mono bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-50 focus:outline-none focus:border-[var(--accent-cyan)]"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'interrupted', 'not_interrupted'] as InterruptFilter[]).map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-2.5 py-1 text-sm rounded transition-colors ${
                  interruptFilter === f
                    ? 'bg-[var(--accent-cyan)] bg-opacity-20 text-[var(--accent-cyan)] border border-[rgba(88,166,255,0.3)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                {f === 'all' ? 'All' : f === 'interrupted' ? 'Interrupted' : 'Not Interrupted'}
              </button>
            ))}
          </div>

          <span className="text-[var(--text-secondary)] text-sm ml-auto">
            {sorted.length} command{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-b border-[var(--border)]">
              <th className={`${thClass} min-w-[200px]`} onClick={() => handleSort('timestamp')}>
                <span className="inline-flex items-center gap-1">Command <SortIcon col="timestamp" /></span>
              </th>
              <th className={thClass} onClick={() => handleSort('model')}>
                <span className="inline-flex items-center gap-1">Model <SortIcon col="model" /></span>
              </th>
              <th className={thClass} onClick={() => handleSort('steps')}>
                <span className="inline-flex items-center gap-1">Steps <SortIcon col="steps" /></span>
              </th>
              <th className={thClass} onClick={() => handleSort('tools_count')}>
                <span className="inline-flex items-center gap-1">Tools <SortIcon col="tools_count" /></span>
              </th>
              <th className={thClass} onClick={() => handleSort('tokens')}>
                <span className="inline-flex items-center gap-1">Tokens <SortIcon col="tokens" /></span>
              </th>
              <th className={thClass} onClick={() => handleSort('interrupted')}>
                <span className="inline-flex items-center gap-1">Status <SortIcon col="interrupted" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((cmd, i) => {
              const globalIdx = safePage * PAGE_SIZE + i
              const isExpanded = expandedIdx === globalIdx
              return (
                <CommandRow
                  key={`${cmd.timestamp}-${i}`}
                  cmd={cmd}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                />
              )
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--text-secondary)] text-base">
                  No commands match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <span className="text-[var(--text-secondary)] text-sm">
            Page {safePage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CommandRow({ cmd, isExpanded, onToggle }: { cmd: CommandDetail; isExpanded: boolean; onToggle: () => void }) {
  const tdClass = 'px-3 py-2 text-sm font-mono text-[var(--text-primary)] whitespace-nowrap'

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-[var(--border)] border-opacity-50 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors"
      >
        <td className={`${tdClass} !whitespace-normal min-w-[200px] max-w-[400px]`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[var(--text-primary)] leading-snug">{truncate(cmd.user_message, 120)}</span>
            <span className="text-[var(--text-secondary)] text-sm opacity-70">{fmtTimestamp(cmd.timestamp)}</span>
          </div>
        </td>
        <td className={tdClass}>
          <span className="text-[var(--accent-cyan)] text-sm">{shortenModel(cmd.model)}</span>
        </td>
        <td className={`${tdClass} text-center`}>{cmd.steps}</td>
        <td className={`${tdClass} text-center`}>{cmd.tools_count}</td>
        <td className={tdClass}>{fmtTokens(cmd.tokens)}</td>
        <td className={tdClass}>
          {cmd.interrupted ? (
            <span className="inline-block px-1.5 py-0.5 text-sm rounded bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.25)]">
              Interrupted
            </span>
          ) : (
            <span className="inline-block px-1.5 py-0.5 text-sm rounded bg-[rgba(72,187,120,0.1)] text-[#48bb78] border border-[rgba(72,187,120,0.2)]">
              Complete
            </span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-[var(--border)] border-opacity-50">
          <td colSpan={6} className="px-4 py-3 bg-[var(--bg-primary)]">
            <div className="space-y-2">
              <div>
                <div className="text-[var(--text-secondary)] text-sm font-medium mb-1">Full Message</div>
                <div className="text-[var(--text-primary)] text-sm font-mono whitespace-pre-wrap break-words leading-relaxed max-h-[200px] overflow-y-auto">
                  {cmd.user_message}
                </div>
              </div>
              {cmd.tool_names.length > 0 && (
                <div>
                  <div className="text-[var(--text-secondary)] text-sm font-medium mb-1">Tools Used</div>
                  <div className="flex flex-wrap gap-1">
                    {cmd.tool_names.map((t, i) => (
                      <span
                        key={i}
                        className="inline-block px-1.5 py-0.5 text-sm font-mono rounded bg-[rgba(118,75,162,0.12)] text-[#a78bfa] border border-[rgba(118,75,162,0.25)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
