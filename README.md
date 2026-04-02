<p align="center">
  <img src="clawlens_logo_full.png" alt="ClawLens" width="500">
</p>

<p align="center">
  Real-time dashboard for monitoring Claude Code sessions
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#development">Development</a> &middot;
  <a href="#how-it-works">How It Works</a>
</p>

---

ClawLens reads the JSONL session files that Claude Code writes to `~/.claude/projects/` and presents them in a live-updating web dashboard. Track token usage, costs, tool invocations, errors, and more across all your coding sessions.

## Features

- **Live session monitoring** -- active sessions update in real time via WebSocket
- **Project-level analytics** -- token usage over time, daily costs, model breakdown, tool usage trends
- **Session deep-dive** -- conversation timeline with turn-by-turn token counts, tool calls, and context window usage
- **Cost tracking** -- per-session and per-project cost estimates based on model pricing
- **Tool & MCP tracking** -- see which tools and MCP servers each session uses, with category breakdowns
- **Error & interruption rates** -- spot problematic sessions at a glance
- **Memory & skill browser** -- inspect memory files and sub-agent skills from within the dashboard
- **Continuation chain linking** -- follows `/clear` continuations across sessions
- **IDE integration** -- links to open files directly in your editor

## Quick Start

### Prerequisites

- [Python 3.11+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Bun](https://bun.sh/) (JavaScript runtime)

### Install and run

```bash
git clone https://github.com/tuongaz/clawlens.git
cd clawlens
make run
```

This builds the frontend, syncs Python dependencies, and starts the server on **http://localhost:3333**.

## Development

Run the frontend and backend separately for hot-reload:

```bash
# Terminal 1 -- Frontend (Vite dev server with HMR)
cd frontend && bun run dev

# Terminal 2 -- Backend
uv run clawlens
```

### Other commands

```bash
make build          # Build frontend + sync Python deps
make clean          # Remove web/dist, frontend/node_modules, .venv
uv run pytest       # Run tests
uv run pyright src/clawlens/  # Type checking
```

## How It Works

ClawLens is a Python (FastAPI) backend that serves a React (Vite) frontend as static files.

```
~/.claude/projects/**/*.jsonl
         |
         v
   ┌───────────┐       WebSocket        ┌──────────────┐
   │  FastAPI   │ ───────────────────>   │  React App   │
   │  Backend   │ <─── REST/WS ───────  │  (Browser)   │
   └───────────┘                         └──────────────┘
```

The backend watches Claude Code's session files, parses JSONL entries into structured data (sessions, turns, tool events), computes analytics, and pushes updates to connected clients over multiple WebSocket channels.

### Tech stack

| Layer    | Technology |
|----------|------------|
| Backend  | Python, FastAPI, Uvicorn, WebSockets |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, HeroUI |
| Charts   | Recharts |
| Package  | uv (Python), Bun (JS) |

### Project structure

```
src/clawlens/          # Backend
  app.py               # FastAPI routes, static file serving
  ws.py                # WebSocket endpoints
  sessions.py          # JSONL parsing and session enrichment
  insights.py          # Analytics computation
  pricing.py           # Token cost calculations
  models.py            # Pydantic data models
frontend/src/          # Frontend
  pages/               # Dashboard, ProjectInsights, SessionDetail
  components/          # Charts, timeline, session views
  hooks/               # WebSocket and data hooks
```

## License

MIT
