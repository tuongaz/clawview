"""JSONL session parser, caching, and grouped loading."""

from __future__ import annotations

import glob
import json
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path

from clawhawk.ide import load_ide_map
from clawhawk.models import Message, ProjectGroup, Session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model context limits
# ---------------------------------------------------------------------------

_MODEL_CONTEXT_LIMITS: dict[str, int] = {
    "claude-opus-4-6": 1_000_000,
    "claude-sonnet-4-6": 200_000,
    "claude-haiku-4-5-20251001": 200_000,
}

_DEFAULT_CONTEXT_LIMIT = 200_000


def get_model_context_limit(model: str) -> int:
    """Return the context window size for a given model name."""
    return _MODEL_CONTEXT_LIMITS.get(model, _DEFAULT_CONTEXT_LIMIT)


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

_RE_COMMAND_NAME = re.compile(r"<command-name>\s*(.*?)\s*</command-name>")


def clean_command_text(s: str) -> str:
    """Extract slash command from XML-tagged user messages, or return as-is."""
    m = _RE_COMMAND_NAME.search(s)
    if m is None:
        return s
    cmd = m.group(1).strip()
    return cmd if cmd else s


def truncate(s: str, max_len: int) -> str:
    """Truncate string, collapsing newlines to spaces."""
    s = s.replace("\n", " ").strip()
    if len(s) <= max_len:
        return s
    if max_len <= 3:
        return s[:max_len]
    return s[: max_len - 3] + "..."


def _truncate_keep_newlines(s: str, max_len: int) -> str:
    """Truncate string, preserving newlines."""
    s = s.strip()
    if len(s) <= max_len:
        return s
    if max_len <= 3:
        return s[:max_len]
    return s[: max_len - 3] + "..."


def decode_project_path(dirname: str) -> str:
    """Decode a project directory name back into a filesystem path.

    The directory name encodes a path by replacing "/" with "-".
    e.g. "-Users-tuongaz-dev-foo" -> "/Users/tuongaz/dev/foo"
    """
    if not dirname:
        return ""
    return dirname.replace("-", "/")


# ---------------------------------------------------------------------------
# Content extraction
# ---------------------------------------------------------------------------


def extract_user_text(content: object) -> str:
    """Extract user-visible text from a message content field."""
    if content is None:
        return ""

    # User messages typically have string content.
    if isinstance(content, str):
        return clean_command_text(content)

    # Sometimes content is an array of parts.
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text":
                    text = part.get("text")
                    if isinstance(text, str):
                        return clean_command_text(text)

    return ""


def _extract_tool_detail(tool_name: str, tool_input: object) -> str:
    """Extract a short detail string from a tool_use input dict."""
    if not isinstance(tool_input, dict):
        return ""

    if tool_name in ("Read", "Edit", "Write"):
        fp = tool_input.get("file_path")
        if isinstance(fp, str):
            return truncate(fp, 120)
    elif tool_name == "Bash":
        desc = tool_input.get("description")
        if isinstance(desc, str) and desc:
            return truncate(desc, 120)
        cmd = tool_input.get("command")
        if isinstance(cmd, str):
            return truncate(cmd, 120)
    elif tool_name in ("Grep", "Glob"):
        pat = tool_input.get("pattern")
        if isinstance(pat, str):
            return truncate(pat, 80)
    elif tool_name == "Agent":
        desc = tool_input.get("description")
        if isinstance(desc, str):
            return truncate(desc, 120)
    elif tool_name in ("WebSearch", "WebFetch"):
        q = tool_input.get("query")
        if isinstance(q, str):
            return truncate(q, 120)
        u = tool_input.get("url")
        if isinstance(u, str):
            return truncate(u, 120)

    return ""


def extract_action(content: object) -> str:
    """Extract the last action description from an assistant message's content."""
    if content is None:
        return ""

    if isinstance(content, str):
        return truncate(content, 80)

    if not isinstance(content, list):
        return ""

    last_action = ""
    for part in content:
        if not isinstance(part, dict):
            continue

        part_type = part.get("type", "")
        if part_type == "tool_use":
            name = part.get("name")
            if isinstance(name, str):
                detail = _extract_tool_detail(name, part.get("input"))
                if detail:
                    last_action = name + ": " + detail
                else:
                    last_action = name
        elif part_type == "text":
            text = part.get("text")
            if isinstance(text, str) and text:
                last_action = truncate(text, 80)

    return last_action


# ---------------------------------------------------------------------------
# Session parser
# ---------------------------------------------------------------------------


def parse_session(fpath: str) -> Session | None:
    """Parse a JSONL session file into a Session object.

    Returns None if the file cannot be parsed or contains no valid session data.
    """
    first_prompt = ""
    last_user_prompt = ""
    last_action = ""
    last_ts = ""
    waiting_for_input = False
    last_model = ""
    last_context_tokens = 0

    session_id = ""
    session_name = ""
    cwd = ""
    git_branch = ""
    version = ""

    try:
        with open(fpath, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    msg = Message.model_validate_json(line)
                except Exception:
                    continue

                # Capture session metadata from first valid message.
                if not session_id and msg.session_id:
                    session_id = msg.session_id
                if msg.cwd:
                    cwd = msg.cwd
                if msg.git_branch:
                    git_branch = msg.git_branch
                if msg.timestamp:
                    last_ts = msg.timestamp
                if msg.version:
                    version = msg.version

                # Extract session name from agent-name entries.
                if msg.type == "agent-name" and msg.agent_name:
                    session_name = msg.agent_name

                # Track whether session is waiting for user input.
                if msg.type == "user":
                    waiting_for_input = False
                elif msg.type == "assistant" and msg.message.stop_reason == "end_turn":
                    waiting_for_input = True
                elif msg.type == "assistant" and msg.message.stop_reason == "tool_use":
                    waiting_for_input = False

                # Extract user prompts.
                if msg.type == "user":
                    text = extract_user_text(msg.message.content)
                    if text:
                        if not first_prompt:
                            first_prompt = truncate(text, 120)
                        last_user_prompt = _truncate_keep_newlines(text, 200)

                # Extract last action from assistant messages.
                if msg.type == "assistant":
                    action = extract_action(msg.message.content)
                    if action:
                        last_action = action

                    # Track token usage from the latest assistant message.
                    if msg.message.model:
                        last_model = msg.message.model
                    u = msg.message.usage
                    context_total = (
                        u.input_tokens
                        + u.cache_creation_input_tokens
                        + u.cache_read_input_tokens
                    )
                    if context_total > 0:
                        last_context_tokens = context_total

    except OSError:
        logger.warning("Failed to read session file: %s", fpath)
        return None

    if not session_id:
        return None

    return Session(
        session_id=session_id,
        name=session_name,
        cwd=cwd,
        git_branch=git_branch,
        timestamp=last_ts,
        first_prompt=first_prompt,
        last_user_prompt=last_user_prompt,
        last_action=truncate(last_action, 160),
        waiting_for_input=waiting_for_input,
        model=last_model,
        context_tokens=last_context_tokens,
        max_context_tokens=get_model_context_limit(last_model),
        version=version,
    )


# ---------------------------------------------------------------------------
# File-level cache
# ---------------------------------------------------------------------------


@dataclass
class CachedSession:
    mod_time: float
    session: Session


_cache: dict[str, CachedSession] = {}


# ---------------------------------------------------------------------------
# Active session detection
# ---------------------------------------------------------------------------


@dataclass
class ActiveInfo:
    """Active session detection data."""

    session_ids: set[str]
    running_cwds: set[str]


def _load_active_info(home: str) -> ActiveInfo:
    """Read ~/.claude/sessions/*.json to find sessions whose process is still running.

    Returns both the set of session IDs listed in the registry AND the set of
    cwds for running processes.  The cwds are used as a fallback: when /clear
    is used, Claude Code creates a new JSONL (with a new session ID) but does
    NOT update the registry file, so the new session ID won't appear in
    ``session_ids``.  We detect this by checking whether a JSONL belongs to a
    cwd that still has a live Claude process.
    """
    info = ActiveInfo(session_ids=set(), running_cwds=set())
    sessions_dir = os.path.join(home, ".claude", "sessions")

    try:
        entries = os.listdir(sessions_dir)
    except OSError:
        return info

    for name in entries:
        if not name.endswith(".json"):
            continue
        fpath = os.path.join(sessions_dir, name)
        try:
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue

        session_id = data.get("sessionId", "")
        pid = data.get("pid", 0)
        cwd = data.get("cwd", "")
        if not session_id or not pid:
            continue

        # Check if process is still running.
        try:
            os.kill(pid, 0)
            info.session_ids.add(session_id)
            if cwd:
                info.running_cwds.add(cwd)
        except (OSError, ProcessLookupError):
            pass

    return info


# ---------------------------------------------------------------------------
# Grouped session loading
# ---------------------------------------------------------------------------


def load_grouped_sessions(limit: int = 0) -> list[ProjectGroup]:
    """Load all JSONL session files, group by project, and return sorted results.

    Globs ``~/.claude/projects/*/*.jsonl``, skips ``subagents/`` directories,
    caches parsed sessions by file modification time, enriches with IDE and
    memory information, and sorts by most recent timestamp descending.
    """
    home = os.path.expanduser("~")

    ide_dir = os.path.join(home, ".claude", "ide")
    ide_map = load_ide_map(ide_dir)
    active_info = _load_active_info(home)
    now = time.time()

    pattern = os.path.join(home, ".claude", "projects", "*", "*.jsonl")
    files = glob.glob(pattern)

    # Group sessions by project directory name.
    project_map: dict[str, list[Session]] = {}

    # First pass: parse all sessions and track the most recently modified
    # JSONL per running cwd (handles /clear creating a new session ID that
    # isn't in the registry).
    cwd_newest: dict[str, tuple[float, str]] = {}  # cwd -> (mod_time, session_id)
    parsed: list[tuple[str, Session]] = []  # (fpath, session)

    for fpath in files:
        if os.sep + "subagents" + os.sep in fpath:
            continue

        try:
            stat = os.stat(fpath)
        except OSError:
            continue

        mod_time = stat.st_mtime

        cached = _cache.get(fpath)
        if cached is not None and cached.mod_time == mod_time:
            sess = cached.session.model_copy()
        else:
            result = parse_session(fpath)
            if result is None:
                continue
            sess = result
            _cache[fpath] = CachedSession(mod_time=mod_time, session=sess.model_copy())

        if sess.cwd in active_info.running_cwds:
            prev = cwd_newest.get(sess.cwd)
            if prev is None or mod_time > prev[0]:
                cwd_newest[sess.cwd] = (mod_time, sess.session_id)

        parsed.append((fpath, sess))

    # Session IDs that are the newest file for a running cwd.
    cwd_active_ids: set[str] = {sid for _, sid in cwd_newest.values()}

    # Second pass: assign active status, project name, IDE client.
    for fpath, sess in parsed:
        is_registered = sess.session_id in active_info.session_ids
        is_newest_in_active_cwd = sess.session_id in cwd_active_ids
        sess.is_active = is_registered or is_newest_in_active_cwd

        dir_name = os.path.basename(os.path.dirname(fpath))
        sess.project_name = decode_project_path(dir_name)

        for folder, client in ide_map.items():
            if sess.cwd == folder or sess.cwd.startswith(folder + os.sep):
                sess.client = client
                break

        project_map.setdefault(dir_name, []).append(sess)

    # Build project groups.
    groups: list[ProjectGroup] = []

    for dir_name, sessions in project_map.items():
        # Sort sessions by timestamp descending.
        sessions.sort(key=lambda s: s.timestamp, reverse=True)

        if limit > 0 and len(sessions) > limit:
            sessions = sessions[:limit]

        # Check if this project has a memory directory with .md files.
        mem_dir = os.path.join(home, ".claude", "projects", dir_name, "memory")
        has_memory = False
        try:
            for entry in os.listdir(mem_dir):
                if entry.endswith(".md") and not os.path.isdir(
                    os.path.join(mem_dir, entry)
                ):
                    has_memory = True
                    break
        except OSError:
            pass

        if has_memory:
            for s in sessions:
                s.uses_memory = True

        decoded_path = decode_project_path(dir_name)
        groups.append(
            ProjectGroup(
                project_name=decoded_path,
                path=decoded_path,
                sessions=sessions,
            )
        )

    # Sort projects by most recent session timestamp descending.
    groups.sort(
        key=lambda g: g.sessions[0].timestamp if g.sessions else "",
        reverse=True,
    )

    return groups
