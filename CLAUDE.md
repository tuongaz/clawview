# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ClawView

A real-time dashboard for monitoring Claude Code sessions. Python (FastAPI) backend reads JSONL session files from `~/.claude/projects/`, parses them, and pushes grouped data to a React frontend over WebSocket. Frontend is built with Vite/React and served as static files.

## Build & Run

```bash
make build          # Build frontend (bun) + sync Python deps (uv)
make run            # Build and run on :3333
make clean          # Remove web/dist, frontend/node_modules, .venv
```

## Development

- Backend: `uv run clawview` (Python, source in `src/clawview/`)
- Frontend: `cd frontend && bun run dev` (React/Vite)
- Tests: `uv run pytest`
- Typecheck: `uv run pyright src/clawview/`
