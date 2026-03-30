import { useMemo } from 'react'
import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { MermaidDiagram } from './MermaidDiagram'
import { DiagraphDiagram } from './DiagraphDiagram'

const DIAGRAM_LANGUAGES = new Set(['mermaid', 'diagraph', 'digraph'])

const components: Components = {
  pre({ children, ...props }) {
    // react-markdown wraps code blocks in <pre><code>. We intercept here
    // to check if the inner <code> has a diagram language class.
    if (
      children &&
      typeof children === 'object' &&
      'props' in (children as React.ReactElement)
    ) {
      const child = children as React.ReactElement<{
        className?: string
        children?: string
      }>
      const className = child.props?.className || ''
      const match = className.match(/language-(\w+)/)
      const lang = match?.[1]

      if (lang && DIAGRAM_LANGUAGES.has(lang)) {
        const code = String(child.props?.children ?? '').trim()
        if (lang === 'mermaid') {
          return <MermaidDiagram code={code} />
        }
        if (lang === 'diagraph' || lang === 'digraph') {
          return <DiagraphDiagram code={code} />
        }
      }
    }
    return <pre {...props}>{children}</pre>
  },
}

interface FrontmatterEntry {
  key: string
  value: string
}

function parseFrontmatter(content: string): { frontmatter: FrontmatterEntry[]; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!match) return { frontmatter: [], body: content }

  const raw = match[1]
  const body = content.slice(match[0].length)
  const entries: FrontmatterEntry[] = []

  for (const line of raw.split('\n')) {
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const key = line.slice(0, sep).trim()
    let value = line.slice(sep + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key) entries.push({ key, value })
  }

  return { frontmatter: entries, body }
}

function FrontmatterBlock({ entries }: { entries: FrontmatterEntry[] }) {
  return (
    <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        Frontmatter
      </div>
      <div className="divide-y divide-[var(--border-light)]">
        {entries.map(({ key, value }) => (
          <div key={key} className="px-3 py-2 flex gap-3">
            <span className="shrink-0 font-mono text-sm font-medium text-[var(--accent-cyan)]">
              {key}
            </span>
            <span className="text-sm text-[var(--text-primary)] break-words min-w-0">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface MarkdownRendererProps {
  children: string
  className?: string
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  const { frontmatter, body } = useMemo(() => parseFrontmatter(children), [children])

  return (
    <div className={className}>
      {frontmatter.length > 0 && <FrontmatterBlock entries={frontmatter} />}
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {body}
      </Markdown>
    </div>
  )
}
