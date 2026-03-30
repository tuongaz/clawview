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

interface MarkdownRendererProps {
  children: string
  className?: string
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {children}
      </Markdown>
    </div>
  )
}
