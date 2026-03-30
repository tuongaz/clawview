import { useEffect, useRef, useState, useCallback } from 'react'

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

const ZOOM_STEP = 0.2
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'diagram' | 'source'>('diagram')
  const [zoom, setZoom] = useState(1)

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

  const zoomIn = useCallback(() => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)), [])
  const zoomReset = useCallback(() => setZoom(1), [])

  const zoomPercent = Math.round(zoom * 100)

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--accent-yellow)] bg-[var(--bg-secondary)] p-3">
        <div className="text-sm text-[var(--accent-yellow)] mb-2">Diagram render error</div>
        <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto">{code}</pre>
      </div>
    )
  }

  return (
    <div className="my-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setTab('diagram')}
            className={`px-2.5 py-1 rounded text-sm cursor-pointer border-none transition-colors ${
              tab === 'diagram'
                ? 'bg-[rgba(88,166,255,0.15)] text-[var(--accent-cyan)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Diagram
          </button>
          <button
            onClick={() => setTab('source')}
            className={`px-2.5 py-1 rounded text-sm cursor-pointer border-none transition-colors ${
              tab === 'source'
                ? 'bg-[rgba(88,166,255,0.15)] text-[var(--accent-cyan)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Source
          </button>
        </div>

        {/* Zoom controls — only visible on diagram tab */}
        {tab === 'diagram' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="w-6 h-6 flex items-center justify-center rounded text-sm cursor-pointer border-none bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-default transition-colors"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={zoomReset}
              className="px-1.5 min-w-[3rem] text-center text-xs font-mono text-[var(--text-secondary)] cursor-pointer border-none bg-transparent hover:text-[var(--text-primary)] transition-colors"
              title="Reset zoom"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="w-6 h-6 flex items-center justify-center rounded text-sm cursor-pointer border-none bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-default transition-colors"
              title="Zoom in"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Content — both views stay mounted to preserve rendered SVG */}
      <div className={`p-4 overflow-auto ${tab !== 'diagram' ? 'hidden' : ''}`}>
        {loading && (
          <div className="text-sm text-[var(--text-secondary)] py-2">Rendering diagram...</div>
        )}
        <div
          ref={containerRef}
          className="flex justify-center [&_svg]:max-w-full origin-top-left transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>

      <div className={`p-4 overflow-auto ${tab !== 'source' ? 'hidden' : ''}`}>
        <pre className="text-sm text-[var(--text-primary)] font-mono whitespace-pre-wrap m-0">{code}</pre>
      </div>
    </div>
  )
}
