"""IDE / terminal detection — reads ~/.claude/ide/*.lock and inspects process ancestry."""

from __future__ import annotations

import json
import logging
import os
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

# Known terminal emulators: lowercased substring -> display name.
_KNOWN_TERMINALS: dict[str, str] = {
    "ghostty": "Ghostty",
    "iterm2": "iTerm2",
    "iterm": "iTerm2",
    "alacritty": "Alacritty",
    "kitty": "Kitty",
    "wezterm": "WezTerm",
    "hyper": "Hyper",
    "warp": "Warp",
    "terminal.app": "Terminal",
    "apple_terminal": "Terminal",
    "windowsterminal": "Windows Terminal",
    "terminal": "Terminal",
}


def _is_pid_alive(pid: int) -> bool:
    """Check whether a process with the given PID is still running."""
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError):
        return False


def _build_process_table() -> tuple[dict[int, int], dict[int, str]]:
    """Return (pid_to_ppid, pid_to_comm) maps from ``ps``."""
    pid_to_ppid: dict[int, int] = {}
    pid_to_comm: dict[int, str] = {}
    try:
        result = subprocess.run(
            ["ps", "-o", "pid=,ppid=,comm=", "-ax"],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired):
        return pid_to_ppid, pid_to_comm

    for line in result.stdout.splitlines():
        parts = line.split(None, 2)
        if len(parts) >= 2:
            try:
                pid = int(parts[0])
                ppid = int(parts[1])
            except ValueError:
                continue
            pid_to_ppid[pid] = ppid
            if len(parts) == 3:
                pid_to_comm[pid] = parts[2]

    return pid_to_ppid, pid_to_comm


def _get_ancestor_pids(pid: int, pid_to_ppid: dict[int, int]) -> list[int]:
    """Return ancestor PIDs for *pid* (excluding pid 0/1), ordered from nearest to farthest."""
    ancestors: list[int] = []
    seen: set[int] = set()
    current = pid
    while current in pid_to_ppid:
        parent = pid_to_ppid[current]
        if parent <= 1 or parent in seen:
            break
        ancestors.append(parent)
        seen.add(parent)
        current = parent
    return ancestors


def load_ide_pid_map(ide_dir: str) -> dict[int, str]:
    """Read all .lock files in *ide_dir* and return ``{ide_pid: ide_name}``.

    Lock files whose PID is no longer running are skipped (stale).
    """
    result: dict[int, str] = {}

    ide_path = Path(ide_dir)
    if not ide_path.is_dir():
        return result

    for entry in ide_path.iterdir():
        if entry.is_dir() or entry.suffix != ".lock":
            continue

        try:
            data = json.loads(entry.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Skipping malformed lock file %s: %s", entry, exc)
            continue

        ide_name: str = data.get("ideName", "")
        if not ide_name:
            continue

        pid = data.get("pid")
        if not isinstance(pid, int):
            continue

        if not _is_pid_alive(pid):
            logger.debug("Skipping stale lock file %s (pid %d not running)", entry.name, pid)
            continue

        result[pid] = ide_name

    return result


def resolve_client_for_pid(session_pid: int, ide_pid_map: dict[int, str]) -> str:
    """Return the client name for *session_pid*.

    First checks if the session is a descendant of a known IDE PID.
    If not, walks the ancestor process names looking for a known terminal emulator.
    Returns ``""`` if nothing matches.
    """
    pid_to_ppid, pid_to_comm = _build_process_table()
    ancestors = _get_ancestor_pids(session_pid, pid_to_ppid)

    # Check IDE ancestry first.
    for ancestor_pid in ancestors:
        if ancestor_pid in ide_pid_map:
            return ide_pid_map[ancestor_pid]

    # Fallback: detect terminal emulator from ancestor command names.
    for ancestor_pid in ancestors:
        comm = pid_to_comm.get(ancestor_pid, "")
        if not comm:
            continue
        comm_lower = comm.lower()
        for key, name in _KNOWN_TERMINALS.items():
            if key in comm_lower:
                return name

    return ""
