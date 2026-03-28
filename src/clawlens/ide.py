"""IDE lock file detection — reads ~/.claude/ide/*.lock to map folders to IDE names."""

from __future__ import annotations

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def load_ide_map(ide_dir: str) -> dict[str, str]:
    """Read all .lock files in *ide_dir* and return ``{folder_path: ide_name}``."""
    result: dict[str, str] = {}

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

        for folder in data.get("workspaceFolders", []):
            result[folder] = ide_name

    return result
