"""WebSocket endpoints for real-time session data updates."""

from __future__ import annotations

import asyncio
import logging

from fastapi import WebSocket, WebSocketDisconnect

from clawhawk.models import DashboardMessage, MemoryFile, ProjectGroup, SessionDetail
from clawhawk.sessions import (
    enrich_session_detail,
    find_session_file,
    load_grouped_sessions,
    load_memory_files,
    parse_session_detail,
)
from clawhawk.stats import load_token_stats

logger = logging.getLogger(__name__)

_TICK_FAST = 0.01  # 10ms when active sessions exist
_TICK_SLOW = 2.0  # 2s when all idle

_DETAIL_TICK_FAST = 0.05  # 50ms when session is active
_DETAIL_TICK_SLOW = 2.0  # 2s when session is idle


def _has_active_sessions(groups: list[ProjectGroup]) -> bool:
    for g in groups:
        for s in g.sessions:
            if s.is_active:
                return True
    return False


async def websocket_endpoint(ws: WebSocket) -> None:
    """Accept a WebSocket connection and push session data on change."""
    await ws.accept()

    last_data: bytes = b""

    try:
        while True:
            groups = await asyncio.to_thread(load_grouped_sessions, 0)
            stats = await asyncio.to_thread(load_token_stats)

            msg = DashboardMessage(groups=groups, stats=stats)
            data_str = msg.model_dump_json(by_alias=True)
            data_bytes = data_str.encode()

            if data_bytes != last_data:
                await ws.send_text(data_str)
                last_data = data_bytes

            interval = _TICK_FAST if _has_active_sessions(groups) else _TICK_SLOW
            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("WebSocket connection closed")


async def _load_session_detail(session_id: str) -> SessionDetail | None:
    """Load and enrich a session detail, returning None if not found."""
    fpath = await asyncio.to_thread(find_session_file, session_id)
    if fpath is None:
        return None
    detail = await asyncio.to_thread(parse_session_detail, fpath)
    if detail is None:
        return None
    await asyncio.to_thread(enrich_session_detail, detail, fpath)
    return detail


async def session_detail_websocket(ws: WebSocket, session_id: str) -> None:
    """Accept a WebSocket connection and push session detail on change."""
    await ws.accept()

    last_data: bytes = b""

    try:
        while True:
            detail = await _load_session_detail(session_id)

            if detail is None:
                await ws.send_text('{"error": "Session not found"}')
                await asyncio.sleep(_DETAIL_TICK_SLOW)
                continue

            data_str = detail.model_dump_json(by_alias=True)
            data_bytes = data_str.encode()

            if data_bytes != last_data:
                await ws.send_text(data_str)
                last_data = data_bytes

            interval = _DETAIL_TICK_FAST if detail.is_active else _DETAIL_TICK_SLOW
            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("Session detail WebSocket connection closed")


def _serialize_memory_files(files: list[MemoryFile]) -> str:
    import json

    return json.dumps([f.model_dump(by_alias=True) for f in files])


async def session_memory_websocket(ws: WebSocket, session_id: str) -> None:
    """Accept a WebSocket connection and push memory files on change."""
    await ws.accept()

    last_data: bytes = b""

    try:
        while True:
            files = await asyncio.to_thread(load_memory_files, session_id)
            data_str = _serialize_memory_files(files)
            data_bytes = data_str.encode()

            if data_bytes != last_data:
                await ws.send_text(data_str)
                last_data = data_bytes

            # Use fast tick if session is active
            detail = await _load_session_detail(session_id)
            is_active = detail.is_active if detail else False
            interval = _DETAIL_TICK_FAST if is_active else _DETAIL_TICK_SLOW
            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("Session memory WebSocket connection closed")
