import { useEffect, useRef, useState, useCallback } from 'react'

let vizLoaded = false
let vizLoadPromise: Promise<void> | null = null
let vizInstance: { renderString: (src: string, options: { format: string; engine?: string }) => string } | null = null

function loadViz(): Promise<void> {
  if (vizLoaded) return Promise.resolve()
  if (vizLoadPromise) return vizLoadPromise

  vizLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.js'
    script.onload = () => {
      const w = window as unknown as { Viz: { instance: () => Promise<typeof vizInstance> } }
      w.Viz.instance().then((instance) => {
        vizInstance = instance
        vizLoaded = true
        resolve()
      }).catch((err: Error) => {
        vizLoadPromise = null
        reject(err)
      })
    }
    script.onerror = () => {
      vizLoadPromise = null
      reject(new Error('Failed to load Graphviz (viz.js)'))
    }
    document.head.appendChild(script)
  })

  return vizLoadPromise
}

const ZOOM_STEP = 0.2
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

export function DiagraphDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'diagram' | 'source'>('diagram')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        await loadViz()
        if (cancelled || !containerRef.current || !vizInstance) return

        const svg = vizInstance.renderString(code, { format: 'svg' })
        if (cancelled || !containerRef.current) return

        containerRef.current.innerHTML = svg

        // Apply dark theme styles to the rendered SVG
        const svgEl = containerRef.current.querySelector('svg')
        if (svgEl) {
          svgEl.style.maxWidth = '100%'
          svgEl.style.height = 'auto'
          // Override default white/black colors for dark theme
          svgEl.querySelectorAll('polygon[fill="white"], polygon[fill="#ffffff"]').forEach(el => {
            el.setAttribute('fill', 'transparent')
          })
          svgEl.querySelectorAll('text').forEach(el => {
            el.setAttribute('fill', '#e6edf3')
          })
          svgEl.querySelectorAll('path[stroke="black"], polygon[stroke="black"]').forEach(el => {
            el.setAttribute('stroke', '#7d8590')
          })
          svgEl.querySelectorAll('ellipse[stroke="black"], polygon[stroke="black"]').forEach(el => {
            el.setAttribute('stroke', '#58a6ff')
          })
          svgEl.querySelectorAll('ellipse[fill="none"]').forEach(el => {
            el.setAttribute('fill', '#161b22')
          })
        }

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

        {/* Zoom controls */}
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

      {/* Content */}
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
