"""Project-level insights computation from JSONL session logs."""

from __future__ import annotations

import glob
import json
import logging
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from clawhawk.pricing import calculate_cost

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Error categorization patterns (from sniffly reference)
# ---------------------------------------------------------------------------

ERROR_PATTERNS: dict[str, list[str]] = {
    "User Interruption": [
        r"user doesn't want to proceed",
        r"user doesn't want to take this action",
        r"\[Request interrupted",
    ],
    "Command Timeout": [r"Command timed out"],
    "File Not Read": [r"File has not been read yet"],
    "File Modified": [r"File has been modified since read"],
    "File Too Large": [r"exceeds maximum allowed"],
    "Content Not Found": [
        r"String to replace not found",
        r"String not found in file",
        r"No module named",
        r"No such file or directory",
        r"File does not exist",
        r"npm error enoent Could not read package\.json",
    ],
    "No Changes": [r"No changes to make"],
    "Permission Error": [
        r"Permission denied",
        r"(?=.*cd to)(?=.*was blocked)",
    ],
    "Tool Not Found": [r"command not found"],
    "Wrong Tool": [r"File is a Jupyter Notebook"],
    "Code Runtime Error": [
        r"Cannot find module",
        r"Traceback",
        r"asyncio_default_fixture_loop_scope",
    ],
    "Port Binding Error": [r"while attempting to bind on address"],
    "Syntax Error": [
        r"SyntaxError",
        r"syntax error",
        r"matches of the string to replace, but replace_all is false",
        r"null \(null\) has no keys",
        r"kill: %1: no such job",
        r"jq: error",
        r"InputValidationError",
    ],
    "Notebook Cell Not Found": [
        r'Cell with ID "[a-z0-9]+" not found in notebook',
    ],
    "Other Tool Errors": [r"\[Details] Error: Error"],
}

USER_INTERRUPTION_API_ERROR = "API Error: Request was aborted."

# ---------------------------------------------------------------------------
# Internal message representation
# ---------------------------------------------------------------------------


def _parse_timestamp(ts: str) -> datetime | None:
    """Parse an ISO timestamp string to a datetime object."""
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _apply_offset(dt: datetime, offset_minutes: int) -> datetime:
    """Apply a timezone offset (in minutes) to a datetime."""
    return dt + timedelta(minutes=offset_minutes)


def _extract_error_text(content: object) -> str:
    """Extract error text from a tool_result message content."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "tool_result":
                    inner = part.get("content", "")
                    if isinstance(inner, str):
                        parts.append(inner)
                    elif isinstance(inner, list):
                        for sub in inner:
                            if isinstance(sub, dict) and sub.get("type") == "text":
                                t = sub.get("text", "")
                                if isinstance(t, str):
                                    parts.append(t)
                elif part.get("type") == "text":
                    t = part.get("text", "")
                    if isinstance(t, str):
                        parts.append(t)
        return "\n".join(parts)
    return ""


def _categorize_error(text: str) -> str:
    """Categorize an error message into one of the predefined categories."""
    for category, patterns in ERROR_PATTERNS.items():
        if any(re.search(p, text, re.IGNORECASE) for p in patterns):
            return category
    return "Other Tool Errors"


def _is_tool_error(content: object) -> bool:
    """Check if a user message content contains a tool error result."""
    if not isinstance(content, list):
        return False
    for part in content:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "tool_result" and part.get("is_error"):
            return True
    return False


def _extract_tool_names_from_content(content: object) -> list[str]:
    """Extract tool_use names from an assistant message content."""
    names: list[str] = []
    if not isinstance(content, list):
        return names
    for part in content:
        if isinstance(part, dict) and part.get("type") == "tool_use":
            name = part.get("name", "")
            if isinstance(name, str) and name:
                names.append(name)
    return names


def _is_real_user_prompt(content: object) -> bool:
    """Check if user message content is a real prompt, not just tool results."""
    if isinstance(content, str):
        return bool(content.strip()) and "<local-command-caveat>" not in content
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                text = part.get("text", "")
                if isinstance(text, str) and "<local-command-caveat>" not in text:
                    return True
        return False
    return False


def _extract_user_text(content: object) -> str:
    """Extract user-visible text from a message content field."""
    if isinstance(content, str):
        if "<local-command-caveat>" in content:
            return ""
        return content
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                text = part.get("text", "")
                if isinstance(text, str) and "<local-command-caveat>" not in text:
                    return text
    return ""


def _is_interruption_message(content: str) -> bool:
    """Check if a message represents a user interruption."""
    return "[Request interrupted" in content


# ---------------------------------------------------------------------------
# Main computation
# ---------------------------------------------------------------------------


def compute_project_stats(
    project_path: str,
    timezone_offset_minutes: int = 0,
) -> dict[str, Any]:
    """Compute project-level statistics from all JSONL session files.

    Args:
        project_path: The encoded project directory name under ~/.claude/projects/
                      (e.g. "-Users-tuongaz-dev-clawhawk")
        timezone_offset_minutes: Client timezone offset in minutes from UTC

    Returns:
        Dictionary with sections: overview, tools, sessions, daily_stats,
        hourly_pattern
    """
    home = os.path.expanduser("~")
    project_dir = os.path.join(home, ".claude", "projects", project_path)

    # Collect all JSONL files in the project directory
    pattern = os.path.join(project_dir, "*.jsonl")
    jsonl_files = glob.glob(pattern)

    if not jsonl_files:
        return _empty_stats()

    # Parse all messages from all session files
    messages = _parse_all_messages(jsonl_files)

    if not messages:
        return _empty_stats()

    overview = _compute_overview(messages)
    tools = _compute_tool_stats(messages)
    sessions = _compute_session_stats(messages)
    daily_stats = _compute_daily_stats(messages, timezone_offset_minutes)
    hourly_pattern = _compute_hourly_pattern(messages, timezone_offset_minutes)
    errors = _compute_error_stats(messages)
    models = _compute_model_stats(messages)
    command_details = _compute_command_details(messages, timezone_offset_minutes)
    user_interactions = _compute_user_interaction_stats(command_details)
    cache = _compute_cache_stats(messages)

    return {
        "overview": overview,
        "tools": tools,
        "sessions": sessions,
        "daily_stats": daily_stats,
        "hourly_pattern": hourly_pattern,
        "errors": errors,
        "models": models,
        "user_interactions": user_interactions,
        "cache": cache,
        "command_details": command_details,
    }


def _empty_stats() -> dict[str, Any]:
    """Return an empty stats structure."""
    return {
        "overview": {
            "total_messages": 0,
            "total_tokens": {
                "input": 0,
                "output": 0,
                "cache_read": 0,
                "cache_creation": 0,
            },
            "session_count": 0,
            "date_range": {"start": None, "end": None},
            "message_types": {},
        },
        "tools": {
            "usage_counts": {},
            "error_counts": {},
            "error_rates": {},
        },
        "sessions": {
            "count": 0,
            "average_duration_seconds": 0.0,
            "average_messages": 0.0,
            "sessions_with_errors": 0,
        },
        "daily_stats": {},
        "hourly_pattern": {
            "messages": {hour: 0 for hour in range(24)},
            "tokens": {
                hour: {"input": 0, "output": 0, "cache_creation": 0, "cache_read": 0}
                for hour in range(24)
            },
        },
        "errors": {
            "total": 0,
            "error_rate": 0.0,
            "by_category": {},
            "details": [],
        },
        "models": {},
        "user_interactions": {
            "real_user_messages": 0,
            "commands_requiring_tools": 0,
            "tool_use_rate": 0.0,
            "avg_tools_per_command": 0.0,
            "avg_steps_per_command": 0.0,
            "avg_tokens_per_command": 0.0,
            "interruption_rate": 0.0,
            "tool_count_distribution": {},
            "model_distribution": {},
        },
        "cache": {
            "total_created": 0,
            "total_read": 0,
            "hit_rate": 0.0,
            "efficiency": 0.0,
            "tokens_saved": 0,
            "cost_saved": 0.0,
            "break_even": False,
            "roi": 0.0,
        },
        "command_details": [],
    }


# ---------------------------------------------------------------------------
# JSONL parsing
# ---------------------------------------------------------------------------


def _parse_all_messages(jsonl_files: list[str]) -> list[dict[str, Any]]:
    """Parse all JSONL files and return a flat list of parsed messages."""
    messages: list[dict[str, Any]] = []

    for fpath in jsonl_files:
        session_id = os.path.basename(fpath).removesuffix(".jsonl")
        try:
            with open(fpath, encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        raw = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    msg_type = raw.get("type", "")
                    if msg_type not in ("user", "assistant"):
                        continue

                    message = raw.get("message", {})
                    if not isinstance(message, dict):
                        continue

                    content = message.get("content")
                    role = message.get("role", "")
                    model = message.get("model", "")
                    usage = message.get("usage", {})
                    if not isinstance(usage, dict):
                        usage = {}
                    timestamp = raw.get("timestamp", "")

                    tokens = {
                        "input": usage.get("input_tokens", 0),
                        "output": usage.get("output_tokens", 0),
                        "cache_creation": usage.get("cache_creation_input_tokens", 0),
                        "cache_read": usage.get("cache_read_input_tokens", 0),
                    }

                    # Detect tool errors (user messages with is_error tool_result)
                    is_error = _is_tool_error(content) if msg_type == "user" else False
                    error_text = ""
                    if is_error:
                        error_text = _extract_error_text(content)

                    # Extract tool names from assistant content
                    tool_names: list[str] = []
                    if msg_type == "assistant":
                        tool_names = _extract_tool_names_from_content(content)

                    # Check if real user prompt
                    is_real_prompt = False
                    user_text = ""
                    if msg_type == "user":
                        is_real_prompt = _is_real_user_prompt(content)
                        user_text = _extract_user_text(content)

                    messages.append({
                        "type": msg_type,
                        "session_id": session_id,
                        "timestamp": timestamp,
                        "model": model,
                        "tokens": tokens,
                        "tool_names": tool_names,
                        "is_error": is_error,
                        "error_text": error_text,
                        "is_real_prompt": is_real_prompt,
                        "user_text": user_text,
                        "content": content,
                        "stop_reason": message.get("stop_reason", ""),
                    })
        except OSError:
            logger.warning("Failed to read JSONL file: %s", fpath)

    # Sort by timestamp for consistent processing
    messages.sort(key=lambda m: m["timestamp"] if m["timestamp"] else "")
    return messages


# ---------------------------------------------------------------------------
# Stat sections
# ---------------------------------------------------------------------------


def _compute_overview(messages: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute overview statistics."""
    total_tokens = defaultdict(int)
    message_types: dict[str, int] = defaultdict(int)
    session_ids: set[str] = set()
    timestamps: list[str] = []

    for msg in messages:
        message_types[msg["type"]] += 1
        session_ids.add(msg["session_id"])
        if msg["timestamp"]:
            timestamps.append(msg["timestamp"])
        for key, val in msg["tokens"].items():
            total_tokens[key] += val

    date_range: dict[str, str | None] = {"start": None, "end": None}
    if timestamps:
        date_range = {"start": min(timestamps), "end": max(timestamps)}

    return {
        "total_messages": len(messages),
        "total_tokens": dict(total_tokens),
        "session_count": len(session_ids),
        "date_range": date_range,
        "message_types": dict(message_types),
    }


def _compute_tool_stats(
    messages: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute tool usage counts, error counts, and error rates."""
    usage_counts: dict[str, int] = defaultdict(int)
    error_counts: dict[str, int] = defaultdict(int)

    # Count tool usage from assistant messages
    for msg in messages:
        if msg["type"] == "assistant":
            for name in msg["tool_names"]:
                usage_counts[name] += 1

    # Count errors per tool: look at user messages with errors and attribute
    # the error to the tool that was called in the preceding assistant message.
    # A simpler approach: count errors from user messages and map to preceding
    # assistant's last tool call.
    prev_tool_names: list[str] = []
    for msg in messages:
        if msg["type"] == "assistant":
            prev_tool_names = msg["tool_names"]
        elif msg["type"] == "user" and msg["is_error"] and prev_tool_names:
            # Attribute error to the last tool in previous assistant message
            last_tool = prev_tool_names[-1]
            error_counts[last_tool] += 1

    error_rates: dict[str, float] = {}
    for tool, count in usage_counts.items():
        err = error_counts.get(tool, 0)
        error_rates[tool] = err / count if count > 0 else 0.0

    return {
        "usage_counts": dict(usage_counts),
        "error_counts": dict(error_counts),
        "error_rates": error_rates,
    }


def _compute_session_stats(
    messages: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute session-level statistics."""
    session_data: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "messages": 0,
            "start": "",
            "end": "",
            "errors": 0,
        }
    )

    for msg in messages:
        sid = msg["session_id"]
        session_data[sid]["messages"] += 1
        ts = msg["timestamp"]
        if ts:
            cur_start = session_data[sid]["start"]
            cur_end = session_data[sid]["end"]
            if not cur_start or ts < cur_start:
                session_data[sid]["start"] = ts
            if not cur_end or ts > cur_end:
                session_data[sid]["end"] = ts
        if msg["is_error"]:
            session_data[sid]["errors"] += 1

    # Calculate durations
    durations: list[float] = []
    for sess in session_data.values():
        start_dt = _parse_timestamp(sess["start"])
        end_dt = _parse_timestamp(sess["end"])
        if start_dt and end_dt:
            dur = (end_dt - start_dt).total_seconds()
            if dur > 0:
                durations.append(dur)

    count = len(session_data)
    avg_duration = sum(durations) / len(durations) if durations else 0.0
    avg_messages = (
        sum(s["messages"] for s in session_data.values()) / count if count else 0.0
    )
    sessions_with_errors = sum(
        1 for s in session_data.values() if s["errors"] > 0
    )

    return {
        "count": count,
        "average_duration_seconds": avg_duration,
        "average_messages": avg_messages,
        "sessions_with_errors": sessions_with_errors,
    }


def _compute_daily_stats(
    messages: list[dict[str, Any]],
    timezone_offset_minutes: int,
) -> dict[str, Any]:
    """Compute per-day breakdown of messages, sessions, tokens, cost."""
    daily: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "messages": 0,
            "sessions": set(),
            "tokens": defaultdict(int),
            "models": defaultdict(lambda: defaultdict(int)),
        }
    )

    for msg in messages:
        dt = _parse_timestamp(msg["timestamp"])
        if dt is None:
            continue
        local = _apply_offset(dt, timezone_offset_minutes)
        date_key = local.strftime("%Y-%m-%d")

        daily[date_key]["messages"] += 1
        daily[date_key]["sessions"].add(msg["session_id"])

        for token_type, count in msg["tokens"].items():
            daily[date_key]["tokens"][token_type] += count

        # Track tokens by model for cost calculation
        if msg["type"] == "assistant" and msg["model"]:
            model = msg["model"]
            for token_type, count in msg["tokens"].items():
                daily[date_key]["models"][model][token_type] += count

    # Convert to serializable output with cost calculation
    result: dict[str, Any] = {}
    for date_key, data in sorted(daily.items()):
        total_cost = 0.0
        input_cost = 0.0
        output_cost = 0.0
        cache_cost = 0.0
        for model, token_counts in data["models"].items():
            cost = calculate_cost(
                model=model,
                input_tokens=token_counts.get("input", 0),
                output_tokens=token_counts.get("output", 0),
                cache_creation_tokens=token_counts.get("cache_creation", 0),
                cache_read_tokens=token_counts.get("cache_read", 0),
            )
            total_cost += cost["total_cost"]
            input_cost += cost["input_cost"]
            output_cost += cost["output_cost"]
            cache_cost += cost["cache_creation_cost"] + cost["cache_read_cost"]

        result[date_key] = {
            "messages": data["messages"],
            "sessions": len(data["sessions"]),
            "tokens": dict(data["tokens"]),
            "cost": total_cost,
            "cost_breakdown": {
                "input": round(input_cost, 6),
                "output": round(output_cost, 6),
                "cache": round(cache_cost, 6),
            },
        }

    return result


def _compute_hourly_pattern(
    messages: list[dict[str, Any]],
    timezone_offset_minutes: int,
) -> dict[str, Any]:
    """Compute messages and tokens bucketed by hour (0-23)."""
    hourly_messages: dict[int, int] = defaultdict(int)
    hourly_tokens: dict[int, dict[str, int]] = defaultdict(
        lambda: {"input": 0, "output": 0, "cache_creation": 0, "cache_read": 0}
    )

    for msg in messages:
        dt = _parse_timestamp(msg["timestamp"])
        if dt is None:
            continue
        local = _apply_offset(dt, timezone_offset_minutes)
        hour = local.hour

        hourly_messages[hour] += 1
        for token_type, count in msg["tokens"].items():
            hourly_tokens[hour][token_type] += count

    # Ensure all 24 hours are represented
    return {
        "messages": {hour: hourly_messages.get(hour, 0) for hour in range(24)},
        "tokens": {
            hour: dict(hourly_tokens.get(hour, {"input": 0, "output": 0, "cache_creation": 0, "cache_read": 0}))
            for hour in range(24)
        },
    }


def _compute_error_stats(messages: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute error statistics: totals, rate, by category, and details."""
    error_messages = [m for m in messages if m["is_error"]]
    total = len(error_messages)
    total_messages = len(messages)
    error_rate = total / total_messages if total_messages > 0 else 0.0

    by_category: dict[str, int] = defaultdict(int)
    details: list[dict[str, Any]] = []

    for msg in error_messages:
        category = _categorize_error(msg["error_text"])
        by_category[category] += 1
        details.append({
            "timestamp": msg["timestamp"],
            "session_id": msg["session_id"],
            "category": category,
            "text": msg["error_text"][:200],
        })

    return {
        "total": total,
        "error_rate": error_rate,
        "by_category": dict(by_category),
        "details": details,
    }


def _compute_model_stats(messages: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute per-model token counts and usage frequency."""
    model_data: dict[str, dict[str, int]] = defaultdict(
        lambda: {
            "count": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_creation_tokens": 0,
            "cache_read_tokens": 0,
        }
    )

    for msg in messages:
        if msg["type"] != "assistant" or not msg["model"]:
            continue
        model = msg["model"]
        model_data[model]["count"] += 1
        model_data[model]["input_tokens"] += msg["tokens"]["input"]
        model_data[model]["output_tokens"] += msg["tokens"]["output"]
        model_data[model]["cache_creation_tokens"] += msg["tokens"]["cache_creation"]
        model_data[model]["cache_read_tokens"] += msg["tokens"]["cache_read"]

    return {k: dict(v) for k, v in model_data.items()}


def _compute_command_details(
    messages: list[dict[str, Any]],
    timezone_offset_minutes: int,
) -> list[dict[str, Any]]:
    """Build per-command detail records from the message stream.

    A "command" starts with a real user prompt and includes all subsequent
    assistant messages until the next real user prompt.
    """
    commands: list[dict[str, Any]] = []
    current_command: dict[str, Any] | None = None

    for msg in messages:
        if msg["type"] == "user" and msg["is_real_prompt"]:
            # Finalize the previous command if any
            if current_command is not None:
                commands.append(current_command)

            # Start a new command
            current_command = {
                "user_message": msg["user_text"][:200],
                "timestamp": msg["timestamp"],
                "session_id": msg["session_id"],
                "model": "",
                "steps": 0,
                "tools_count": 0,
                "tokens": 0,
                "interrupted": False,
                "tool_names": [],
            }
        elif msg["type"] == "assistant" and current_command is not None:
            current_command["steps"] += 1
            current_command["tools_count"] += len(msg["tool_names"])
            current_command["tool_names"].extend(msg["tool_names"])
            total_tokens = sum(msg["tokens"].values())
            current_command["tokens"] += total_tokens
            if not current_command["model"] and msg["model"]:
                current_command["model"] = msg["model"]
            # Detect interruption via stop_reason or content pattern
            if msg["stop_reason"] == "end_turn":
                pass  # Normal
            # Check if next message is an interruption (handled below)

    # Don't forget the last command
    if current_command is not None:
        commands.append(current_command)

    # Mark interruptions: check if a user message following a command is an
    # interruption message (not a real prompt). Walk messages again to detect.
    _mark_interruptions(messages, commands)

    # Deduplicate tool_names to a unique list
    for cmd in commands:
        cmd["tool_names"] = list(dict.fromkeys(cmd["tool_names"]))

    return commands


def _mark_interruptions(
    messages: list[dict[str, Any]],
    commands: list[dict[str, Any]],
) -> None:
    """Mark commands that were interrupted by the user.

    An interrupted command is one where a user message with an interruption
    pattern appears before the next real user prompt.
    """
    # Build a set of command timestamps for quick lookup
    cmd_by_ts: dict[str, dict[str, Any]] = {}
    for cmd in commands:
        cmd_by_ts[cmd["timestamp"]] = cmd

    current_cmd_ts: str | None = None
    for msg in messages:
        if msg["type"] == "user" and msg["is_real_prompt"]:
            current_cmd_ts = msg["timestamp"]
        elif msg["type"] == "user" and not msg["is_real_prompt"]:
            # Check if this is an interruption message
            error_text = msg["error_text"] or _extract_error_text(msg["content"])
            content_str = msg.get("user_text", "")
            if (
                _is_interruption_message(error_text)
                or _is_interruption_message(content_str)
                or USER_INTERRUPTION_API_ERROR in str(msg["content"])
            ):
                if current_cmd_ts and current_cmd_ts in cmd_by_ts:
                    cmd_by_ts[current_cmd_ts]["interrupted"] = True


def _compute_user_interaction_stats(
    command_details: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute user interaction stats from the command details array."""
    total_commands = len(command_details)
    if total_commands == 0:
        return {
            "real_user_messages": 0,
            "commands_requiring_tools": 0,
            "tool_use_rate": 0.0,
            "avg_tools_per_command": 0.0,
            "avg_steps_per_command": 0.0,
            "avg_tokens_per_command": 0.0,
            "interruption_rate": 0.0,
            "tool_count_distribution": {},
            "model_distribution": {},
        }

    # Filter out interruption-only commands for averages
    non_interrupted = [c for c in command_details if not c["interrupted"]]
    active_count = len(non_interrupted) if non_interrupted else total_commands

    commands_with_tools = sum(1 for c in command_details if c["tools_count"] > 0)
    total_tools = sum(c["tools_count"] for c in command_details)
    total_steps = sum(c["steps"] for c in command_details)
    total_tokens = sum(c["tokens"] for c in command_details)
    interrupted_count = sum(1 for c in command_details if c["interrupted"])

    tool_use_rate = commands_with_tools / total_commands * 100 if total_commands > 0 else 0.0
    avg_tools = total_tools / active_count if active_count > 0 else 0.0
    avg_steps = total_steps / active_count if active_count > 0 else 0.0
    avg_tokens = total_tokens / active_count if active_count > 0 else 0.0
    interruption_rate = interrupted_count / total_commands * 100 if total_commands > 0 else 0.0

    # Tool count distribution
    tool_dist: dict[int, int] = defaultdict(int)
    for cmd in command_details:
        tool_dist[cmd["tools_count"]] += 1

    # Model distribution
    model_dist: dict[str, int] = defaultdict(int)
    for cmd in command_details:
        if cmd["model"]:
            model_dist[cmd["model"]] += 1

    return {
        "real_user_messages": total_commands,
        "commands_requiring_tools": commands_with_tools,
        "tool_use_rate": tool_use_rate,
        "avg_tools_per_command": avg_tools,
        "avg_steps_per_command": avg_steps,
        "avg_tokens_per_command": avg_tokens,
        "interruption_rate": interruption_rate,
        "tool_count_distribution": dict(tool_dist),
        "model_distribution": dict(model_dist),
    }


def _compute_cache_stats(messages: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute cache efficiency statistics."""
    assistant_msgs = [m for m in messages if m["type"] == "assistant"]
    total_assistant = len(assistant_msgs)

    total_created = sum(m["tokens"]["cache_creation"] for m in assistant_msgs)
    total_read = sum(m["tokens"]["cache_read"] for m in assistant_msgs)

    msgs_with_cache_read = sum(
        1 for m in assistant_msgs if m["tokens"]["cache_read"] > 0
    )

    hit_rate = (
        msgs_with_cache_read / total_assistant * 100 if total_assistant > 0 else 0.0
    )
    efficiency = (
        min(100.0, total_read / total_created * 100) if total_created > 0 else 0.0
    )
    tokens_saved = total_read - total_created

    # Cost saved: what it would cost as fresh input minus actual cache costs
    # fresh_cost = total_read * 1.0 (normalized input cost)
    # actual_cost = total_read * 0.10 + total_created * 1.25
    # cost_saved = fresh_cost - actual_cost
    cost_saved = total_read * 1.0 - (total_read * 0.10 + total_created * 1.25)

    break_even = total_read > total_created
    roi = (total_read / total_created - 1) * 100 if total_created > 0 else 0.0

    return {
        "total_created": total_created,
        "total_read": total_read,
        "hit_rate": hit_rate,
        "efficiency": efficiency,
        "tokens_saved": tokens_saved,
        "cost_saved": cost_saved,
        "break_even": break_even,
        "roi": roi,
    }
