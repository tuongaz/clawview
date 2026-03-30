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
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-base">
          Loading skill...
        </div>
      )}

      {error && <ErrorAlert message={error} />}

      {!loading && !error && content != null && (
        <div className="prose prose-invert prose-base max-w-none text-base [&_p]:text-base [&_li]:text-base [&_h1]:text-base [&_h2]:text-base [&_h3]:text-base [&_code]:text-sm [&_pre]:text-sm">
          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</Markdown>
        </div>
      )}
    </Sidebar>
  )
}
