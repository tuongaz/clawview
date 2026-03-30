import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Brain, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useMemoryFiles } from '../hooks/useMemoryFiles'
import { ErrorAlert, EmptyState } from './ui'
import { Sidebar } from './Sidebar'

export function MemoryPanel() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { files, loading, error } = useMemoryFiles(sessionId ?? '')
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  const onClose = () => navigate(`/session/${sessionId}`)

  // Auto-expand when there's exactly one file
  const effectiveExpanded = expandedFile ?? (files.length === 1 ? files[0].name : null)

  return (
    <Sidebar
      onClose={onClose}
      icon={<Brain size={18} className="text-[var(--accent-magenta)]" />}
      title="Memory Files"
      footer={
        !loading && files.length > 0 ? (
          <span className="text-sm text-[var(--text-secondary)]">
            {files.length} memory file{files.length !== 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-base">
          Loading memory files...
        </div>
      )}

      {error && <ErrorAlert message={error} />}

      {!loading && !error && files.length === 0 && (
        <EmptyState message="No memory files found" />
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
                  <span className="text-base font-mono text-[var(--text-primary)] truncate">
                    {file.name}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                    <div className="prose prose-invert prose-base max-w-none text-base [&_p]:text-base [&_li]:text-base [&_h1]:text-base [&_h2]:text-base [&_h3]:text-base [&_code]:text-sm [&_pre]:text-sm">
                      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{file.content}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Sidebar>
  )
}
