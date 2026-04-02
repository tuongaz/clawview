"""ClawView – real-time Claude Code session dashboard."""

import argparse
import asyncio
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from clawview.sessions import (
    enrich_session_detail,
    find_session_file,
    load_memory_files,
    load_skill_content,
    parse_session_detail,
)
from clawview.ws import (
    session_detail_websocket,
    session_insights_websocket,
    session_memory_websocket,
    websocket_endpoint,
)

# Static files bundled inside the package (src/clawview/web/)
_DIST_DIR = Path(__file__).resolve().parent / "web"

app = FastAPI(title="ClawView")


def _setup_static_files() -> None:
    """Mount static file serving if the dist directory exists."""
    if not _DIST_DIR.is_dir():
        return

    # Serve /assets/ directly for hashed JS/CSS bundles
    assets_dir = _DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


_setup_static_files()


@app.websocket("/ws")
async def ws_route(ws: WebSocket) -> None:
    await websocket_endpoint(ws)


@app.websocket("/ws/sessions/{session_id}")
async def ws_session_detail_route(ws: WebSocket, session_id: str) -> None:
    await session_detail_websocket(ws, session_id)


@app.websocket("/ws/sessions/{session_id}/memory")
async def ws_session_memory_route(ws: WebSocket, session_id: str) -> None:
    await session_memory_websocket(ws, session_id)


@app.websocket("/ws/insights/{session_id}")
async def ws_insights_route(ws: WebSocket, session_id: str) -> None:
    await session_insights_websocket(ws, session_id)


@app.get("/api/sessions/{session_id}")
async def get_session_detail(session_id: str) -> JSONResponse:
    """Return full session detail for a given session ID."""
    fpath = await asyncio.to_thread(find_session_file, session_id)
    if fpath is None:
        return JSONResponse(
            status_code=404,
            content={"error": f"Session {session_id} not found"},
        )

    detail = await asyncio.to_thread(parse_session_detail, fpath)
    if detail is None:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to parse session {session_id}"},
        )

    await asyncio.to_thread(enrich_session_detail, detail, fpath)

    return JSONResponse(
        content=detail.model_dump(by_alias=True, mode="json"),
    )


@app.get("/api/sessions/{session_id}/memory")
async def get_session_memory(session_id: str) -> JSONResponse:
    """Return memory files for the project that owns the given session."""
    files = await asyncio.to_thread(load_memory_files, session_id)
    return JSONResponse(
        content=[f.model_dump(by_alias=True) for f in files],
    )


@app.get("/api/sessions/{session_id}/skills/{skill_name:path}")
async def get_skill_content(session_id: str, skill_name: str) -> JSONResponse:
    """Return the content of a skill file by name."""
    result = await asyncio.to_thread(load_skill_content, session_id, skill_name)
    if result is None:
        return JSONResponse(
            status_code=404,
            content={"error": f"Skill '{skill_name}' not found"},
        )
    return JSONResponse(content={
        "name": skill_name,
        "content": result["content"],
        "source": result["source"],
        "path": result["path"],
    })


@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str) -> FileResponse:
    """Serve static files or fall back to index.html for SPA routing."""
    # Try to serve the exact file first (favicon.svg, icons.svg, etc.)
    file_path = _DIST_DIR / full_path
    if full_path and file_path.is_file():
        return FileResponse(str(file_path))

    # Fall back to index.html for all other paths (SPA routing)
    return FileResponse(
        str(_DIST_DIR / "index.html"),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="ClawView dashboard server")
    parser.add_argument("--port", type=int, default=3333)
    args = parser.parse_args()
    uvicorn.run(app, host="0.0.0.0", port=args.port)
