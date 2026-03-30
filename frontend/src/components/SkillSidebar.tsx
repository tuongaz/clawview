import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, FolderOpen, User, Puzzle } from 'lucide-react'
import { ErrorAlert, MarkdownRenderer } from './ui'
import { Sidebar } from './Sidebar'

const sourceLabels: Record<string, { label: string; icon: typeof FolderOpen }> = {
  project: { label: 'Project', icon: FolderOpen },
  user: { label: 'User', icon: User },
  plugin: { label: 'Plugin', icon: Puzzle },
}

export function SkillPanel() {
  const { sessionId, skillName } = useParams<{ sessionId: string; skillName: string }>()
  const navigate = useNavigate()
  const [content, setContent] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const decodedName = skillName ? decodeURIComponent(skillName) : ''

  const onClose = () => navigate(`/session/${sessionId}`)

  useEffect(() => {
    if (!sessionId || !decodedName) return
    setLoading(true)
    setError(null)

    fetch(`/api/sessions/${sessionId}/skills/${encodeURIComponent(decodedName)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Skill not found`)
        }
        return res.json()
      })
      .then((data) => {
        setContent(data.content)
        setSource(data.source ?? null)
        setSourcePath(data.path ?? null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [sessionId, decodedName])

  const sourceInfo = source ? sourceLabels[source] : null
  const SourceIcon = sourceInfo?.icon

  return (
    <Sidebar
      onClose={onClose}
      icon={<Sparkles size={18} className="text-[var(--accent-yellow)]" />}
      title={<span className="font-mono">{decodedName}</span>}
      footer={sourceInfo && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          {SourceIcon && <SourceIcon size={14} />}
          <span>{sourceInfo.label}</span>
          {sourcePath && (
            <span className="font-mono text-xs opacity-60 truncate" title={sourcePath}>{sourcePath}</span>
          )}
        </div>
      )}
    >
      {loading && (
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-base">
          Loading skill...
        </div>
      )}

      {error && <ErrorAlert message={error} />}

      {!loading && !error && content != null && (
        <MarkdownRenderer className="prose prose-invert prose-base max-w-none text-base [&_p]:text-base [&_li]:text-base [&_h1]:text-base [&_h2]:text-base [&_h3]:text-base [&_code]:text-sm [&_pre]:text-sm">{content}</MarkdownRenderer>
      )}
    </Sidebar>
  )
}
