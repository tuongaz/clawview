"""JSONL session parser, caching, and grouped loading."""

from __future__ import annotations

import glob
import json
import logging
import os
import re
import time
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path

from clawlens.ide import load_ide_pid_map, resolve_client_for_pid
from clawlens.models import MemoryFile, Message, ProjectGroup, Session, SessionDetail, SubagentInvocation, Turn, TurnEvent, UserImage

logger = logging.getLogger(__name__)

# Regex to strip ANSI escape sequences (CSI, OSC, and other ESC sequences).
_ANSI_RE = re.compile(
    r"\x1b"        # ESC character
    r"(?:"
    r"\[[0-9;]*[A-Za-z]"   # CSI sequences: ESC [ ... letter
    r"|\][^\x07\x1b]*(?:\x07|\x1b\\)"  # OSC sequences: ESC ] ... BEL/ST
    r"|\([A-Za-z]"          # Character set: ESC ( letter
    r"|[A-Za-z]"            # Two-char sequences: ESC letter
    r")"
)


def _strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


# ---------------------------------------------------------------------------
# Model context limits
# ---------------------------------------------------------------------------

_DEFAULT_CONTEXT_LIMIT = 1_000_000

_CONTEXT_BRACKET_RE = re.compile(r"\[(\d+)(k|m)\]", re.IGNORECASE)


def _parse_context_from_model(model: str) -> int | None:
    """Extract context limit from a bracket suffix like ``[1m]`` or ``[200k]``."""
    match = _CONTEXT_BRACKET_RE.search(model)
    if not match:
        return None
    value = int(match.group(1))
    unit = match.group(2).lower()
    if unit == "m":
        return value * 1_000_000
    return value * 1_000


def get_model_context_limit(model: str) -> int:
    """Return the context window size for a given model name.

    Resolution order:
    1. Bracket suffix in the session model string (e.g. ``claude-sonnet-4-6[1m]``)
    2. ``ANTHROPIC_MODEL`` env var bracket suffix
    3. Default: 1M tokens
    """
    if model:
        limit = _parse_context_from_model(model)
        if limit is not None:
            return limit

    env_model = os.environ.get("ANTHROPIC_MODEL", "")
    if env_model:
        limit = _parse_context_from_model(env_model)
        if limit is not None:
            return limit

    return _DEFAULT_CONTEXT_LIMIT


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


def load_skill_content(session_id: str, skill_name: str) -> dict[str, str] | None:
    """Load the content of a skill file by name for the given session.

    Searches project-level ``.claude/skills/``, global ``~/.claude/skills/``,
    and plugin skill directories.

    Returns a dict with ``content`` and ``source`` keys, or ``None``.
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
        content = Path(match).read_text(encoding="utf-8")
    except OSError:
        return None

    # Determine source category
    match_path = os.path.abspath(match)
    if cwd and match_path.startswith(os.path.abspath(cwd)):
        source = "project"
    elif match_path.startswith(os.path.join(home, ".claude", "plugins")):
        source = "plugin"
    else:
        source = "user"

    return {"content": content, "source": source, "path": match_path}


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

_RE_COMMAND_NAME = re.compile(r"<command-name>\s*(.*?)\s*</command-name>")
_RE_LOCAL_CMD_STDOUT = re.compile(
    r"<local-command-stdout>\s*(.*?)\s*</local-command-stdout>", re.DOTALL
)


def clean_command_text(s: str) -> str:
    """Extract slash command from XML-tagged user messages, or return as-is."""
    # Unwrap <local-command-stdout>...</local-command-stdout> wrapper.
    m = _RE_LOCAL_CMD_STDOUT.search(s)
    if m:
        s = m.group(1)

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
        return _strip_ansi(clean_command_text(content))

    # Sometimes content is an array of parts.
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text":
                    text = part.get("text")
                    if isinstance(text, str) and not _is_system_boilerplate(text):
                        return _strip_ansi(clean_command_text(text))

    return ""


def _extract_tool_detail(tool_name: str, tool_input: object) -> tuple[str, str]:
    """Extract a detail string and optional extra from a tool_use input dict.

    Returns (detail, extra).  For Bash tools, *detail* is the description
    (or command when no description) and *extra* is the command when there is
    a separate description.
    """
    if not isinstance(tool_input, dict):
        return ("", "")

    if tool_name in ("Read", "Edit", "Write"):
        fp = tool_input.get("file_path")
        if isinstance(fp, str):
            return (fp, "")
    elif tool_name == "Bash":
        desc = tool_input.get("description")
        cmd = tool_input.get("command")
        if isinstance(desc, str) and desc:
            extra = cmd if isinstance(cmd, str) else ""
            return (desc, extra)
        if isinstance(cmd, str):
            return (cmd, "")
    elif tool_name in ("Grep", "Glob"):
        pat = tool_input.get("pattern")
        path = tool_input.get("path")
        extra = path if isinstance(path, str) and path else ""
        if isinstance(pat, str):
            return (pat, extra)
    elif tool_name == "Skill":
        skill = tool_input.get("skill")
        args = tool_input.get("args")
        extra = args if isinstance(args, str) and args else ""
        if isinstance(skill, str):
            return (skill, extra)
    elif tool_name == "Agent":
        desc = tool_input.get("description")
        stype = tool_input.get("subagent_type")
        extra = stype if isinstance(stype, str) and stype else ""
        if isinstance(desc, str):
            return (desc, extra)
    elif tool_name in ("WebSearch", "WebFetch"):
        q = tool_input.get("query")
        if isinstance(q, str):
            url = tool_input.get("url")
            extra = url if isinstance(url, str) and url else ""
            return (q, extra)
        u = tool_input.get("url")
        if isinstance(u, str):
            return (u, "")

    return ("", "")


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


def _extract_user_images(content: object) -> list[UserImage]:
    """Extract images from a user message content field."""
    if not isinstance(content, list):
        return []
    images: list[UserImage] = []
    for part in content:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "image":
            source = part.get("source")
            if isinstance(source, dict) and source.get("type") == "base64":
                media_type = source.get("media_type", "")
                data = source.get("data", "")
                if isinstance(media_type, str) and isinstance(data, str) and data:
                    images.append(UserImage(media_type=media_type, data=data))
    return images


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
                detail, _extra = _extract_tool_detail(name, part.get("input"))
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
    first_real_prompt = ""  # first non-command user text
    last_user_prompt = ""
    last_action = ""
    first_ts = ""
    last_ts = ""
    waiting_for_input = False
    last_model = ""
    last_context_tokens = 0
    started_from_clear = False

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

                # Detect SessionStart:clear from progress entries.
                if not started_from_clear:
                    try:
                        raw = json.loads(line)
                        data = raw.get("data")
                        if isinstance(data, dict):
                            hook_name = data.get("hookName", "")
                            if isinstance(hook_name, str) and ":clear" in hook_name:
                                started_from_clear = True
                    except (json.JSONDecodeError, AttributeError):
                        pass

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
                    if not first_ts:
                        first_ts = msg.timestamp
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
                        # Track first non-command prompt for /clear sessions.
                        if not first_real_prompt and not text.strip().startswith("/"):
                            first_real_prompt = truncate(text, 120)
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

    # For sessions started from /clear, prefer the first real prompt.
    display_prompt = first_prompt
    if started_from_clear and first_real_prompt:
        display_prompt = first_real_prompt

    return Session(
        session_id=session_id,
        name=session_name,
        cwd=cwd,
        git_branch=git_branch,
        timestamp=last_ts,
        start_timestamp=first_ts,
        first_prompt=display_prompt,
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
    first_ts = ""
    last_ts = ""
    version = ""
    first_prompt = ""
    first_real_prompt = ""
    last_user_prompt = ""
    last_action = ""
    waiting_for_input = False
    last_model = ""
    last_context_tokens = 0
    started_from_clear = False

    # Turns
    turns: list[Turn] = []
    current_turn: Turn | None = None
    turn_index = 0

    # Aggregates
    tool_usage: dict[str, int] = {}
    mcp_tool_usage: dict[str, int] = {}
    skills_used: set[str] = set()
    subagents_used: set[str] = set()
    subagent_details: dict[str, list[SubagentInvocation]] = {}
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

                # Detect SessionStart:clear from progress entries.
                if not started_from_clear:
                    data = raw.get("data")
                    if isinstance(data, dict):
                        hook_name = data.get("hookName", "")
                        if isinstance(hook_name, str) and ":clear" in hook_name:
                            started_from_clear = True

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
                    if not first_ts:
                        first_ts = msg.timestamp
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
                        if not first_real_prompt and not text.strip().startswith("/"):
                            first_real_prompt = truncate(text, 120)
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
                            images=_extract_user_images(msg.message.content),
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
                                text=_strip_ansi(content.strip()),
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
                                    text_parts.append(_strip_ansi(t.strip()))
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
                                    detail, extra = _extract_tool_detail(
                                        name, part.get("input")
                                    )
                                    current_turn.events.append(
                                        TurnEvent(
                                            kind="tool",
                                            tool_name=name,
                                            tool_detail=detail,
                                            tool_extra=extra,
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
                                                inv = SubagentInvocation(
                                                    description=tool_input.get("description", ""),
                                                    prompt=tool_input.get("prompt", ""),
                                                    model=tool_input.get("model", ""),
                                                    mode=tool_input.get("mode", ""),
                                                    run_in_background=bool(
                                                        tool_input.get("run_in_background", False)
                                                    ),
                                                )
                                                subagent_details.setdefault(label, []).append(inv)
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

        # Fill in missing durations from timestamps.
        for i, turn in enumerate(turns):
            if turn.duration_ms == 0 and i + 1 < len(turns):
                t_start = turn.timestamp
                t_end = turns[i + 1].timestamp
                if t_start and t_end:
                    try:
                        start_dt = datetime.fromisoformat(t_start)
                        end_dt = datetime.fromisoformat(t_end)
                        diff = int((end_dt - start_dt).total_seconds() * 1000)
                        if diff > 0:
                            turn.duration_ms = diff
                            total_duration += diff
                    except (ValueError, TypeError):
                        pass

    except OSError:
        logger.warning("Failed to read session file: %s", fpath)
        return None

    if not session_id:
        return None

    display_prompt = first_prompt
    if started_from_clear and first_real_prompt:
        display_prompt = first_real_prompt

    return SessionDetail(
        session_id=session_id,
        name=session_name,
        cwd=cwd,
        git_branch=git_branch,
        timestamp=last_ts,
        start_timestamp=first_ts,
        first_prompt=display_prompt,
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
        subagent_details=subagent_details,
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
    ide_pid_map = load_ide_pid_map(ide_dir)
    session_pid = active_info.session_pids.get(detail.session_id)
    if session_pid:
        detail.client = resolve_client_for_pid(session_pid, ide_pid_map)

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

    # Find continuation links for this session.
    _enrich_continuation_links(detail, fpath, home)


def _enrich_continuation_links(
    detail: SessionDetail, fpath: str, home: str
) -> None:
    """Find continuation links for a session detail.

    Uses the session cache (populated by load_grouped_sessions) or falls back
    to scanning sibling files.  Only checks files whose modification time is
    within the gap threshold of this session's timestamps for efficiency.
    """
    project_dir = os.path.dirname(fpath)
    dir_name = os.path.basename(project_dir)

    # Try the cache first — load_grouped_sessions populates it.
    cached_sessions: list[Session] = []
    for cached_path, cached_entry in _cache.items():
        if os.path.dirname(cached_path) == project_dir:
            cached_sessions.append(cached_entry.session)

    if cached_sessions:
        # Use cached sessions for fast linking.
        _link_continuation_from_list(detail, cached_sessions)
        return

    # Fallback: scan siblings, but only those with recent mod times.
    if not detail.start_timestamp and not detail.timestamp:
        return

    try:
        detail_start = datetime.fromisoformat(detail.start_timestamp) if detail.start_timestamp else None
        detail_end = datetime.fromisoformat(detail.timestamp) if detail.timestamp else None
    except (ValueError, TypeError):
        return

    # Convert to epoch for file mtime comparison.
    window = _CLEAR_GAP_THRESHOLD + 60  # extra buffer for mtime precision
    detail_start_epoch = detail_start.timestamp() if detail_start else 0
    detail_end_epoch = detail_end.timestamp() if detail_end else 0

    try:
        siblings = [
            f
            for f in os.listdir(project_dir)
            if f.endswith(".jsonl") and f != os.path.basename(fpath)
        ]
    except OSError:
        return

    best_from: tuple[float, str] | None = None
    best_as: tuple[float, str] | None = None

    for sib in siblings:
        sib_path = os.path.join(project_dir, sib)
        sib_id = sib.removesuffix(".jsonl")

        # Skip files whose mtime is far from our timestamps.
        try:
            mtime = os.stat(sib_path).st_mtime
        except OSError:
            continue
        if detail_end_epoch and abs(mtime - detail_end_epoch) > window:
            if detail_start_epoch and abs(mtime - detail_start_epoch) > window:
                continue

        # Quick parse: read first timestamp from first few lines.
        sib_first_ts = ""
        sib_last_ts = ""
        try:
            with open(sib_path, encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        raw = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    ts = raw.get("timestamp", "")
                    if isinstance(ts, str) and ts:
                        if not sib_first_ts:
                            sib_first_ts = ts
                        sib_last_ts = ts
        except OSError:
            continue

        if not sib_first_ts or not sib_last_ts:
            continue

        try:
            sib_start = datetime.fromisoformat(sib_first_ts)
            sib_end = datetime.fromisoformat(sib_last_ts)
        except (ValueError, TypeError):
            continue

        if detail_end:
            gap = (sib_start - detail_end).total_seconds()
            if 0 <= gap <= _CLEAR_GAP_THRESHOLD:
                if best_as is None or gap < best_as[0]:
                    best_as = (gap, sib_id)

        if detail_start:
            gap = (detail_start - sib_end).total_seconds()
            if 0 <= gap <= _CLEAR_GAP_THRESHOLD:
                if best_from is None or gap < best_from[0]:
                    best_from = (gap, sib_id)

    if best_from:
        detail.continued_from = best_from[1]
    if best_as:
        detail.continued_as = best_as[1]


def _link_continuation_from_list(
    detail: SessionDetail, sessions: list[Session]
) -> None:
    """Link a SessionDetail to its continuation using a list of parsed sessions."""
    if not detail.start_timestamp and not detail.timestamp:
        return

    try:
        detail_start = datetime.fromisoformat(detail.start_timestamp) if detail.start_timestamp else None
        detail_end = datetime.fromisoformat(detail.timestamp) if detail.timestamp else None
    except (ValueError, TypeError):
        return

    best_from: tuple[float, str] | None = None
    best_as: tuple[float, str] | None = None

    for sess in sessions:
        if sess.session_id == detail.session_id:
            continue

        try:
            sib_start = datetime.fromisoformat(sess.start_timestamp) if sess.start_timestamp else None
            sib_end = datetime.fromisoformat(sess.timestamp) if sess.timestamp else None
        except (ValueError, TypeError):
            continue

        if detail_end and sib_start:
            gap = (sib_start - detail_end).total_seconds()
            if 0 <= gap <= _CLEAR_GAP_THRESHOLD:
                if best_as is None or gap < best_as[0]:
                    best_as = (gap, sess.session_id)

        if detail_start and sib_end:
            gap = (detail_start - sib_end).total_seconds()
            if 0 <= gap <= _CLEAR_GAP_THRESHOLD:
                if best_from is None or gap < best_from[0]:
                    best_from = (gap, sess.session_id)

    if best_from:
        detail.continued_from = best_from[1]
    if best_as:
        detail.continued_as = best_as[1]


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
    session_pids: dict[str, int]  # session_id -> pid


def _load_active_info(home: str) -> ActiveInfo:
    """Read ~/.claude/sessions/*.json to find sessions whose process is still running.

    Returns the set of session IDs whose registered PID is still alive.
    When multiple registry entries share the same PID (e.g. after /rename or
    /clear), only the most recently modified entry is kept.

    For resumed sessions (where the registry session ID has no matching JSONL
    file), resolves the actual session by finding the most recently modified
    JSONL file updated after the process started.
    """
    info = ActiveInfo(session_ids=set(), session_pids={})
    sessions_dir = os.path.join(home, ".claude", "sessions")

    try:
        entries = os.listdir(sessions_dir)
    except OSError:
        return info

    # Collect all live registry entries grouped by PID so we can deduplicate.
    # pid -> list of (file_mod_time, session_id, started_at_sec)
    pid_entries: dict[int, list[tuple[float, str, float]]] = {}

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
        started_at_ms = data.get("startedAt", 0)
        if not session_id or not pid:
            continue

        # Check if process is still running.
        try:
            os.kill(pid, 0)
        except (OSError, ProcessLookupError):
            continue

        started_at = started_at_ms / 1000 if isinstance(started_at_ms, (int, float)) else 0.0
        pid_entries.setdefault(pid, []).append((stat.st_mtime, session_id, started_at))

    projects_dir = os.path.join(home, ".claude", "projects")
    matched_jsonls: set[str] = set()
    unresolved_started_ats: list[float] = []

    # For each PID, only keep the most recently modified registry entry.
    unresolved: list[tuple[float, int]] = []  # (started_at, pid)
    for pid, elist in pid_entries.items():
        elist.sort(reverse=True)  # newest first by mod_time
        _, session_id, started_at = elist[0]

        # Check if this session ID has a corresponding JSONL file.
        pattern = os.path.join(projects_dir, "*", f"{session_id}.jsonl")
        matches = glob.glob(pattern)
        if matches:
            info.session_ids.add(session_id)
            info.session_pids[session_id] = pid
            matched_jsonls.update(matches)
        else:
            # Resumed session – registry ID doesn't match any JSONL file.
            unresolved.append((started_at, pid))

    # Resolve resumed sessions by finding JSONL files modified after
    # the process started (excluding files already matched to other PIDs).
    # A staleness threshold prevents matching JSONL files that haven't been
    # written to recently — this handles cases where the process is alive but
    # the session was closed (e.g. process didn't exit cleanly).
    _STALE_THRESHOLD = 300  # 5 minutes
    if unresolved:
        now = time.time()
        all_jsonl = glob.glob(os.path.join(projects_dir, "*", "*.jsonl"))
        for started_at, pid in unresolved:
            best: tuple[float, str, str] | None = None  # (mtime, session_id, path)
            for jpath in all_jsonl:
                if jpath in matched_jsonls:
                    continue
                if os.sep + "subagents" + os.sep in jpath:
                    continue
                try:
                    mtime = os.stat(jpath).st_mtime
                except OSError:
                    continue
                if started_at and mtime >= started_at and (now - mtime) < _STALE_THRESHOLD:
                    if best is None or mtime > best[0]:
                        sid = os.path.basename(jpath).removesuffix(".jsonl")
                        best = (mtime, sid, jpath)

            if best is not None:
                info.session_ids.add(best[1])
                info.session_pids[best[1]] = pid
                matched_jsonls.add(best[2])

    return info


# ---------------------------------------------------------------------------
# Session continuation linking
# ---------------------------------------------------------------------------

# Maximum gap (in seconds) between the end of one session and the start of
# the next for them to be considered a continuation chain (via /clear).
_CLEAR_GAP_THRESHOLD = 300  # 5 minutes


def _detect_clear_start(fpath: str) -> bool:
    """Check if a session JSONL file was started via /clear.

    Reads only the first few lines for efficiency.
    """
    try:
        with open(fpath, encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f):
                if i > 10:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                except json.JSONDecodeError:
                    continue
                data = raw.get("data")
                if isinstance(data, dict):
                    hook_name = data.get("hookName", "")
                    if isinstance(hook_name, str) and ":clear" in hook_name:
                        return True
    except OSError:
        pass
    return False


def _link_continuation_sessions(
    project_map: dict[str, list[Session]],
) -> None:
    """Link sessions that are continuations of each other via /clear.

    For each project, sorts sessions by start_timestamp and links each
    session that started from /clear to its predecessor if the gap between
    the predecessor's last timestamp and this session's start is small.
    """
    for sessions in project_map.values():
        if len(sessions) < 2:
            continue

        # Sort by start_timestamp ascending.
        by_start = sorted(sessions, key=lambda s: s.start_timestamp or "")

        # Build a lookup for fast access.
        by_id: dict[str, Session] = {s.session_id: s for s in sessions}

        for i, sess in enumerate(by_start):
            # Only look at sessions whose first_prompt was originally a command
            # or that we detected started from /clear.  We check if the session
            # file has SessionStart:clear – but since we already detected it
            # during parse_session, we can approximate: if the start_timestamp
            # is close to the predecessor's end timestamp.
            if i == 0:
                continue

            # Quick check: is this session's start very close to the
            # predecessor's end?
            prev = by_start[i - 1]
            if not sess.start_timestamp or not prev.timestamp:
                continue

            try:
                start_dt = datetime.fromisoformat(sess.start_timestamp)
                prev_end_dt = datetime.fromisoformat(prev.timestamp)
            except (ValueError, TypeError):
                continue

            gap = (start_dt - prev_end_dt).total_seconds()
            if 0 <= gap <= _CLEAR_GAP_THRESHOLD:
                # Link them.
                prev.continued_as = sess.session_id
                sess.continued_from = prev.session_id


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
    ide_pid_map = load_ide_pid_map(ide_dir)
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

        session_pid = active_info.session_pids.get(sess.session_id)
        if session_pid:
            sess.client = resolve_client_for_pid(session_pid, ide_pid_map)

        project_map.setdefault(dir_name, []).append(sess)

    # Link continuation sessions within each project.
    _link_continuation_sessions(project_map)

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

    # Sort projects: active projects (with running sessions) pinned at the top
    # in stable alphabetical order so they don't shift on every update, then
    # inactive projects by most recent session timestamp descending.
    active_groups = sorted(
        (g for g in groups if any(s.is_active for s in g.sessions)),
        key=lambda g: g.project_name,
    )
    inactive_groups = sorted(
        (g for g in groups if not any(s.is_active for s in g.sessions)),
        key=lambda g: max((s.timestamp for s in g.sessions), default=""),
        reverse=True,
    )
    groups = active_groups + inactive_groups

    return groups
