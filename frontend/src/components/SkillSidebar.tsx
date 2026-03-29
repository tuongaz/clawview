import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { ErrorAlert } from './ui'
import { Sidebar } from './Sidebar'

export function SkillPanel() {
  const { sessionId, skillName } = useParams<{ sessionId: string; skillName: string }>()
  const navigate = useNavigate()
  const [content, setContent] = useState<string | null>(null)
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
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [sessionId, decodedName])

  return (
    <Sidebar
      onClose={onClose}
      icon={<Sparkles size={18} className="text-[var(--accent-yellow)]" />}
      title={<span className="font-mono">{decodedName}</span>}
    >
      {loading && (
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-sm">
          Loading skill...
        </div>
      )}

      {error && <ErrorAlert message={error} />}

      {!loading && !error && content != null && (
        <div className="prose prose-invert prose-sm max-w-none text-sm [&_p]:text-sm [&_li]:text-sm [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-[13px] [&_pre]:text-[13px]">
          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</Markdown>
        </div>
      )}
    </Sidebar>
  )
}
