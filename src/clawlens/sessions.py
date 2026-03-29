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

from clawlens.ide import load_ide_map
from clawlens.models import MemoryFile, Message, ProjectGroup, Session, SessionDetail, Turn, TurnEvent

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


def find_session_file(session_id: str) -> str | None:
    """Locate a JSONL session file by session ID.

    Globs ``~/.claude/projects/*/{session_id}.jsonl`` and returns the first
    match, or ``None`` if no matching file is found.
    """
    home = os.path.expanduser("~")
    pattern = os.path.join(home, ".claude", "projects", "*", f"{session_id}.jsonl")
    matches = glob.glob(pattern)
    return matches[0] if matches else None


def load_memory_files(session_id: str) -> list[MemoryFile]:
    """Load all .md memory files for the project that owns *session_id*."""
    fpath = find_session_file(session_id)
    if fpath is None:
        return []

    home = os.path.expanduser("~")
    dir_name = os.path.basename(os.path.dirname(fpath))
    mem_dir = os.path.join(home, ".claude", "projects", dir_name, "memory")

    results: list[MemoryFile] = []
    try:
        for entry in sorted(os.listdir(mem_dir)):
            full = os.path.join(mem_dir, entry)
            if entry.endswith(".md") and not os.path.isdir(full):
                try:
                    content = Path(full).read_text(encoding="utf-8")
                    results.append(MemoryFile(name=entry, content=content))
                except OSError:
                    pass
    except OSError:
        pass
    return results


def _extract_cwd(fpath: str) -> str:
    """Extract CWD from the first few lines of a JSONL session file."""
    try:
        with open(fpath, encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f):
                if i > 30:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                except json.JSONDecodeError:
                    continue
                cwd = raw.get("cwd", "")
                if cwd:
                    return cwd
    except OSError:
        pass
    return ""


def _plugin_skill_dirs(home: str, plugin_name: str) -> list[str]:
    """Return skill directories for a plugin by reading installed_plugins.json."""
    dirs: list[str] = []
    plugins_json = os.path.join(home, ".claude", "plugins", "installed_plugins.json")
    try:
        data = json.loads(Path(plugins_json).read_text(encoding="utf-8"))
        for key, entries in data.get("plugins", {}).items():
            # key format: "pluginName@marketplace"
            if key.split("@")[0] == plugin_name and isinstance(entries, list):
                for entry in entries:
                    install_path = entry.get("installPath", "")
                    if install_path:
                        dirs.append(os.path.join(install_path, "skills"))
    except (OSError, json.JSONDecodeError, KeyError):
        pass
    # Fallback: legacy flat path
    dirs.append(os.path.join(home, ".claude", "plugins", plugin_name, "skills"))
    return dirs


def _find_skill_file(base_name: str, search_dirs: list[str]) -> str | None:
    """Search directories for a skill file matching *base_name*."""
    for dir_path in search_dirs:
        if not os.path.isdir(dir_path):
            continue
        # Direct match: {name}.md
        candidate = os.path.join(dir_path, f"{base_name}.md")
        if os.path.isfile(candidate):
            return candidate
        # Directory-based skill: {name}/SKILL.md
        candidate = os.path.join(dir_path, base_name, "SKILL.md")
        if os.path.isfile(candidate):
            return candidate
        # Recursive search for nested skill files
        for root, dirs, files in os.walk(dir_path):
            # Check if a subdirectory name matches and contains SKILL.md
            for d in dirs:
                if d == base_name:
                    skill_md = os.path.join(root, d, "SKILL.md")
                    if os.path.isfile(skill_md):
                        return skill_md
            for fname in files:
                stem = fname.removesuffix(".md") if fname.endswith(".md") else fname
                if stem == base_name:
                    return os.path.join(root, fname)
    return None


def load_skill_content(session_id: str, skill_name: str) -> str | None:
    """Load the content of a skill file by name for the given session.

    Searches project-level ``.claude/skills/``, global ``~/.claude/skills/``,
    and plugin skill directories.
    """
    fpath = find_session_file(session_id)
    if fpath is None:
        return None

    cwd = _extract_cwd(fpath)
    home = os.path.expanduser("~")

    # Strip plugin prefix for file lookup
    base_name = skill_name.split(":")[-1] if ":" in skill_name else skill_name
    plugin_name = skill_name.split(":")[0] if ":" in skill_name else None

    search_dirs: list[str] = []

    # Project-level skills
    if cwd:
        search_dirs.append(os.path.join(cwd, ".claude", "skills"))

    # Global skills
    search_dirs.append(os.path.join(home, ".claude", "skills"))

    # Plugin skills – resolve via installed_plugins.json for real install paths
    if plugin_name:
        search_dirs.extend(_plugin_skill_dirs(home, plugin_name))

    match = _find_skill_file(base_name, search_dirs)
    if match is None:
        return None

    try:
        return Path(match).read_text(encoding="utf-8")
    except OSError:
        return None


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
        if _is_system_boilerplate(content):
            return ""
        return clean_command_text(content)

    # Sometimes content is an array of parts.
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text":
                    text = part.get("text")
                    if isinstance(text, str) and not _is_system_boilerplate(text):
                        return clean_command_text(text)

    return ""


def _extract_tool_detail(tool_name: str, tool_input: object) -> str:
    """Extract a detail string from a tool_use input dict."""
    if not isinstance(tool_input, dict):
        return ""

    if tool_name in ("Read", "Edit", "Write"):
        fp = tool_input.get("file_path")
        if isinstance(fp, str):
            return fp
    elif tool_name == "Bash":
        desc = tool_input.get("description")
        if isinstance(desc, str) and desc:
            return desc
        cmd = tool_input.get("command")
        if isinstance(cmd, str):
            return cmd
    elif tool_name in ("Grep", "Glob"):
        pat = tool_input.get("pattern")
        if isinstance(pat, str):
            return pat
    elif tool_name == "Skill":
        skill = tool_input.get("skill")
        if isinstance(skill, str):
            return skill
    elif tool_name == "Agent":
        desc = tool_input.get("description")
        if isinstance(desc, str):
            return desc
    elif tool_name in ("WebSearch", "WebFetch"):
        q = tool_input.get("query")
        if isinstance(q, str):
            return q
        u = tool_input.get("url")
        if isinstance(u, str):
            return u

    return ""


def _is_system_boilerplate(text: str) -> bool:
    """Return True if the text is a system-generated boilerplate message."""
    return "<local-command-caveat>" in text


def _is_real_user_prompt(content: object) -> bool:
    """Check if user message content is a real prompt, not just tool results.

    A real user prompt is a string or a list containing at least one text part.
    Lists containing only tool_result parts are tool-result feedback, not new turns.
    System boilerplate messages (e.g. local-command-caveat) are also excluded.
    """
    if isinstance(content, str):
        return bool(content.strip()) and not _is_system_boilerplate(content)
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                text = part.get("text", "")
                if isinstance(text, str) and not _is_system_boilerplate(text):
                    return True
        return False
    return False


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


def parse_session_detail(fpath: str) -> SessionDetail | None:
    """Parse a JSONL session file into a full SessionDetail with conversation turns.

    Returns None if the file cannot be parsed or contains no valid session data.
    """
    # Metadata (mirrors parse_session)
    session_id = ""
    session_name = ""
    cwd = ""
    git_branch = ""
    last_ts = ""
    version = ""
    first_prompt = ""
    last_user_prompt = ""
    last_action = ""
    waiting_for_input = False
    last_model = ""
    last_context_tokens = 0

    # Turns
    turns: list[Turn] = []
    current_turn: Turn | None = None
    turn_index = 0

    # Aggregates
    tool_usage: dict[str, int] = {}
    mcp_tool_usage: dict[str, int] = {}
    skills_used: set[str] = set()
    subagents_used: set[str] = set()
    commands_used: set[str] = set()
    total_input = 0
    total_output = 0
    total_cache_creation = 0
    total_cache_read = 0
    total_duration = 0

    try:
        with open(fpath, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                # Parse raw JSON first for fields not in the Message model.
                try:
                    raw = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # Check for duration events (durationMs at top level).
                duration_ms = raw.get("durationMs")
                if duration_ms is not None and isinstance(duration_ms, (int, float)):
                    dur = int(duration_ms)
                    if current_turn is not None:
                        current_turn.duration_ms = dur
                    total_duration += dur

                # Parse as Message model.
                try:
                    msg = Message.model_validate(raw)
                except Exception:
                    continue

                # Capture session metadata.
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
                if msg.type == "agent-name" and msg.agent_name:
                    session_name = msg.agent_name

                # Track waiting state.
                if msg.type == "user":
                    waiting_for_input = False
                elif msg.type == "assistant" and msg.message.stop_reason == "end_turn":
                    waiting_for_input = True
                elif msg.type == "assistant" and msg.message.stop_reason == "tool_use":
                    waiting_for_input = False

                # User prompt handling.
                if msg.type == "user":
                    text = extract_user_text(msg.message.content)
                    if text:
                        if not first_prompt:
                            first_prompt = truncate(text, 120)
                        last_user_prompt = _truncate_keep_newlines(text, 200)
                        # Detect /command usage
                        stripped = text.strip()
                        if stripped.startswith("/"):
                            cmd = stripped.split()[0]
                            commands_used.add(cmd)

                    # Start a new turn on real user prompts.
                    if _is_real_user_prompt(msg.message.content):
                        if current_turn is not None:
                            turns.append(current_turn)
                        turn_index += 1
                        current_turn = Turn(
                            index=turn_index,
                            timestamp=msg.timestamp or last_ts,
                            user_prompt=extract_user_text(msg.message.content),
                        )

                # Assistant message handling.
                if msg.type == "assistant" and current_turn is not None:
                    action = extract_action(msg.message.content)
                    if action:
                        last_action = action

                    if msg.message.model:
                        last_model = msg.message.model
                        current_turn.model = msg.message.model

                    if msg.message.stop_reason:
                        current_turn.stop_reason = msg.message.stop_reason

                    # Accumulate usage for the turn.
                    u = msg.message.usage
                    current_turn.usage.input_tokens += u.input_tokens
                    current_turn.usage.output_tokens += u.output_tokens
                    current_turn.usage.cache_creation_input_tokens += (
                        u.cache_creation_input_tokens
                    )
                    current_turn.usage.cache_read_input_tokens += (
                        u.cache_read_input_tokens
                    )

                    total_input += u.input_tokens
                    total_output += u.output_tokens
                    total_cache_creation += u.cache_creation_input_tokens
                    total_cache_read += u.cache_read_input_tokens

                    # Context tokens from latest assistant message.
                    ctx = (
                        u.input_tokens
                        + u.cache_creation_input_tokens
                        + u.cache_read_input_tokens
                    )
                    if ctx > 0:
                        last_context_tokens = ctx

                    # Extract assistant text and tool calls in order.
                    content = msg.message.content
                    if isinstance(content, str) and content.strip():
                        current_turn.events.append(
                            TurnEvent(
                                kind="text",
                                text=content.strip(),
                            )
                        )
                    elif isinstance(content, list):
                        text_parts: list[str] = []
                        for part in content:
                            if not isinstance(part, dict):
                                continue
                            ptype = part.get("type", "")
                            if ptype == "text":
                                t = part.get("text", "")
                                if isinstance(t, str) and t.strip():
                                    text_parts.append(t.strip())
                            elif ptype == "tool_use":
                                # Flush accumulated text before tool.
                                if text_parts:
                                    combined = "\n\n".join(text_parts)
                                    current_turn.events.append(
                                        TurnEvent(
                                            kind="text",
                                            text=combined,
                                        )
                                    )
                                    text_parts = []
                                name = part.get("name", "")
                                if isinstance(name, str) and name:
                                    detail = _extract_tool_detail(
                                        name, part.get("input")
                                    )
                                    current_turn.events.append(
                                        TurnEvent(
                                            kind="tool",
                                            tool_name=name,
                                            tool_detail=detail,
                                        )
                                    )
                                    if name.startswith("mcp__"):
                                        mcp_tool_usage[name] = (
                                            mcp_tool_usage.get(name, 0) + 1
                                        )
                                    else:
                                        tool_usage[name] = (
                                            tool_usage.get(name, 0) + 1
                                        )
                                    # Track skills and subagents
                                    tool_input = part.get("input")
                                    if isinstance(tool_input, dict):
                                        if name == "Skill":
                                            skill = tool_input.get("skill")
                                            if isinstance(skill, str) and skill:
                                                skills_used.add(skill)
                                        elif name == "Agent":
                                            label = tool_input.get(
                                                "subagent_type", ""
                                            )
                                            if not label:
                                                label = tool_input.get(
                                                    "description", ""
                                                )
                                            if isinstance(label, str) and label:
                                                subagents_used.add(label)
                        # Flush any remaining text after the last tool.
                        if text_parts:
                            combined = "\n\n".join(text_parts)
                            current_turn.events.append(
                                TurnEvent(
                                    kind="text",
                                    text=combined,
                                )
                            )

        # Append the last turn.
        if current_turn is not None:
            turns.append(current_turn)

    except OSError:
        logger.warning("Failed to read session file: %s", fpath)
        return None

    if not session_id:
        return None

    return SessionDetail(
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
        tool_usage=tool_usage,
        mcp_tool_usage=mcp_tool_usage,
        skills_used=sorted(skills_used),
        subagents_used=sorted(subagents_used),
        commands_used=sorted(commands_used),
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        total_cache_creation_tokens=total_cache_creation,
        total_cache_read_tokens=total_cache_read,
        total_duration_ms=total_duration,
        turn_count=len(turns),
        turns=turns,
    )


def _is_session_active(
    session_id: str, cwd: str, fpath: str, active_info: ActiveInfo
) -> bool:
    """Determine if a session is active based on the session registry.

    A session is active only if it is registered in the session registry
    (i.e. its process is still running).
    """
    return session_id in active_info.session_ids


def enrich_session_detail(detail: SessionDetail, fpath: str) -> None:
    """Enrich a parsed SessionDetail with active status, IDE client, memory flag, and project name."""
    home = os.path.expanduser("~")
    active_info = _load_active_info(home)
    detail.is_active = _is_session_active(
        detail.session_id, detail.cwd, fpath, active_info
    )

    ide_dir = os.path.join(home, ".claude", "ide")
    ide_map = load_ide_map(ide_dir)
    for folder, client in ide_map.items():
        if detail.cwd == folder or detail.cwd.startswith(folder + os.sep):
            detail.client = client
            break

    dir_name = os.path.basename(os.path.dirname(fpath))
    detail.project_name = decode_project_path(dir_name)

    mem_dir = os.path.join(home, ".claude", "projects", dir_name, "memory")
    try:
        for entry in os.listdir(mem_dir):
            if entry.endswith(".md") and not os.path.isdir(
                os.path.join(mem_dir, entry)
            ):
                detail.uses_memory = True
                break
    except OSError:
        pass


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


def _load_active_info(home: str) -> ActiveInfo:
    """Read ~/.claude/sessions/*.json to find sessions whose process is still running.

    Returns the set of session IDs whose registered PID is still alive.
    When multiple registry entries share the same PID (e.g. after /rename or
    /clear), only the most recently modified entry is kept.
    """
    info = ActiveInfo(session_ids=set())
    sessions_dir = os.path.join(home, ".claude", "sessions")

    try:
        entries = os.listdir(sessions_dir)
    except OSError:
        return info

    # Collect all live registry entries grouped by PID so we can deduplicate.
    # pid -> list of (file_mod_time, session_id)
    pid_entries: dict[int, list[tuple[float, str]]] = {}

    for name in entries:
        if not name.endswith(".json"):
            continue
        fpath = os.path.join(sessions_dir, name)
        try:
            stat = os.stat(fpath)
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue

        session_id = data.get("sessionId", "")
        pid = data.get("pid", 0)
        if not session_id or not pid:
            continue

        # Check if process is still running.
        try:
            os.kill(pid, 0)
        except (OSError, ProcessLookupError):
            continue

        pid_entries.setdefault(pid, []).append((stat.st_mtime, session_id))

    # For each PID, only keep the most recently modified registry entry.
    for pid, elist in pid_entries.items():
        elist.sort(reverse=True)  # newest first by mod_time
        _, session_id = elist[0]
        info.session_ids.add(session_id)

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

        parsed.append((fpath, sess))

    # Assign active status, project name, IDE client.
    for fpath, sess in parsed:
        sess.is_active = sess.session_id in active_info.session_ids

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
        # Sort: active sessions first (stable order by session_id), then
        # inactive sessions by timestamp descending.  Using a stable key for
        # active sessions prevents them from shifting position on every update.
        sessions.sort(
            key=lambda s: (not s.is_active, "" if s.is_active else s.timestamp),
            reverse=True,
        )

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
