import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Brain, X, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useMemoryFiles } from '../hooks/useMemoryFiles'

export function MemoryPanel() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { files, loading, error } = useMemoryFiles(sessionId ?? '')
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  const onClose = () => navigate(`/session/${sessionId}`)

  // Auto-expand when there's exactly one file
  const effectiveExpanded = expandedFile ?? (files.length === 1 ? files[0].name : null)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[480px] max-w-[90vw] bg-[var(--bg-primary)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl shadow-black/40 animate-slide-in">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border)] shrink-0">
          <Brain size={18} className="text-[var(--accent-magenta)]" />
          <h2 className="text-sm font-semibold text-[var(--text-bright)] flex-1">Memory Files</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-sm">
              Loading memory files...
            </div>
          )}

          {error && (
            <div className="text-[var(--accent-red)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="text-center text-[var(--text-secondary)] py-12 text-sm">
              No memory files found
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="space-y-2">
              {files.map(file => {
                const isExpanded = effectiveExpanded === file.name
                return (
                  <div key={file.name} className="border border-[var(--border)] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFile(isExpanded ? null : file.name)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--bg-secondary)] transition-colors text-left cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-[var(--text-secondary)] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-[var(--text-secondary)] shrink-0" />
                      )}
                      <FileText size={14} className="text-[var(--accent-magenta)] shrink-0" />
                      <span className="text-xs font-mono text-[var(--text-primary)] truncate">
                        {file.name}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                        <div className="prose prose-invert prose-sm max-w-none text-xs [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[11px] [&_pre]:text-[11px]">
                          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{file.content}</Markdown>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && files.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border)] shrink-0">
            <span className="text-[11px] text-[var(--text-secondary)]">
              {files.length} memory file{files.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
