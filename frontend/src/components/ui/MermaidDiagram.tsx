import { useEffect, useRef, useState } from 'react'

let mermaidLoaded = false
let mermaidLoadPromise: Promise<void> | null = null

function loadMermaid(): Promise<void> {
  if (mermaidLoaded) return Promise.resolve()
  if (mermaidLoadPromise) return mermaidLoadPromise

  mermaidLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
    script.onload = () => {
      const w = window as unknown as { mermaid: { initialize: (config: Record<string, unknown>) => void } }
      w.mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#1f6feb',
          primaryTextColor: '#e6edf3',
          primaryBorderColor: '#58a6ff',
          lineColor: '#7d8590',
          secondaryColor: '#161b22',
          tertiaryColor: '#0d1117',
          background: '#0d1117',
          mainBkg: '#161b22',
          nodeBorder: '#58a6ff',
          clusterBkg: '#161b2299',
          clusterBorder: '#30363d',
          titleColor: '#e6edf3',
          edgeLabelBackground: '#161b22',
          nodeTextColor: '#e6edf3',
        },
        securityLevel: 'loose',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      })
      mermaidLoaded = true
      resolve()
    }
    script.onerror = () => {
      mermaidLoadPromise = null
      reject(new Error('Failed to load Mermaid'))
    }
    document.head.appendChild(script)
  })

  return mermaidLoadPromise
}

let renderCounter = 0

export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const id = `mermaid-${++renderCounter}`

    async function render() {
      try {
        await loadMermaid()
        if (cancelled || !containerRef.current) return

        const w = window as unknown as {
          mermaid: { render: (id: string, code: string) => Promise<{ svg: string }> }
        }
        const { svg } = await w.mermaid.render(id, code)
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = svg
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to render diagram')
        setLoading(false)
      }
    }

    render()
    return () => { cancelled = true }
  }, [code])

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--accent-yellow)] bg-[var(--bg-secondary)] p-3">
        <div className="text-sm text-[var(--accent-yellow)] mb-2">Diagram render error</div>
        <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto">{code}</pre>
      </div>
    )
  }

  return (
    <div className="my-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-4 overflow-x-auto">
      {loading && (
        <div className="text-sm text-[var(--text-secondary)] py-2">Rendering diagram...</div>
      )}
      <div ref={containerRef} className="flex justify-center [&_svg]:max-w-full" />
    </div>
  )
}
