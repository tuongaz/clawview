"""Tests for session parsing, text extraction, and model context limits."""

from __future__ import annotations

import json
from pathlib import Path

from clawlens.sessions import (
    clean_command_text,
    decode_project_path,
    extract_action,
    extract_user_text,
    get_model_context_limit,
    parse_session,
    truncate,
)


# ---------------------------------------------------------------------------
# get_model_context_limit
# ---------------------------------------------------------------------------


def test_bracket_suffix_1m() -> None:
    assert get_model_context_limit("claude-sonnet-4-6[1m]") == 1_000_000


def test_bracket_suffix_200k() -> None:
    assert get_model_context_limit("claude-sonnet-4-6[200k]") == 200_000


def test_no_bracket_falls_back_to_env(monkeypatch: object) -> None:
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-4-6[1m]")  # type: ignore[attr-defined]
    assert get_model_context_limit("claude-sonnet-4-6") == 1_000_000


def test_no_bracket_no_env_falls_back_to_default(monkeypatch: object) -> None:
    monkeypatch.delenv("ANTHROPIC_MODEL", raising=False)  # type: ignore[attr-defined]
    assert get_model_context_limit("claude-sonnet-4-6") == 1_000_000


def test_empty_model_falls_back_to_default(monkeypatch: object) -> None:
    monkeypatch.delenv("ANTHROPIC_MODEL", raising=False)  # type: ignore[attr-defined]
    assert get_model_context_limit("") == 1_000_000


# ---------------------------------------------------------------------------
# clean_command_text
# ---------------------------------------------------------------------------


def test_clean_command_text_extracts_command() -> None:
    s = "some preamble <command-name>/commit</command-name> other text"
    assert clean_command_text(s) == "/commit"


def test_clean_command_text_returns_original_without_tag() -> None:
    assert clean_command_text("hello world") == "hello world"


# ---------------------------------------------------------------------------
# truncate
# ---------------------------------------------------------------------------


def test_truncate_short_string_unchanged() -> None:
    assert truncate("abc", 10) == "abc"


def test_truncate_long_string_adds_ellipsis() -> None:
    assert truncate("a" * 20, 10) == "a" * 7 + "..."


def test_truncate_collapses_newlines() -> None:
    assert truncate("a\nb\nc", 100) == "a b c"


# ---------------------------------------------------------------------------
# decode_project_path
# ---------------------------------------------------------------------------


def test_decode_project_path() -> None:
    assert decode_project_path("-Users-tuongaz-dev-foo") == "/Users/tuongaz/dev/foo"


def test_decode_project_path_empty() -> None:
    assert decode_project_path("") == ""


# ---------------------------------------------------------------------------
# extract_user_text
# ---------------------------------------------------------------------------


def test_extract_user_text_string() -> None:
    assert extract_user_text("hello") == "hello"


def test_extract_user_text_list_with_text_part() -> None:
    content = [{"type": "text", "text": "some prompt"}]
    assert extract_user_text(content) == "some prompt"


def test_extract_user_text_none() -> None:
    assert extract_user_text(None) == ""


# ---------------------------------------------------------------------------
# extract_action
# ---------------------------------------------------------------------------


def test_extract_action_tool_use() -> None:
    content = [
        {"type": "tool_use", "name": "Read", "input": {"file_path": "/tmp/foo.py"}},
    ]
    assert extract_action(content) == "Read: /tmp/foo.py"


def test_extract_action_text() -> None:
    content = [{"type": "text", "text": "Thinking about the problem..."}]
    assert extract_action(content) == "Thinking about the problem..."


def test_extract_action_string_content() -> None:
    assert extract_action("simple response") == "simple response"


def test_extract_action_none() -> None:
    assert extract_action(None) == ""


def test_extract_action_last_wins() -> None:
    """When multiple parts exist, the last one should win."""
    content = [
        {"type": "text", "text": "first"},
        {"type": "tool_use", "name": "Bash", "input": {"command": "ls"}},
        {"type": "text", "text": "final answer"},
    ]
    assert extract_action(content) == "final answer"


# ---------------------------------------------------------------------------
# parse_session
# ---------------------------------------------------------------------------


def _make_jsonl_line(
    *,
    type: str = "user",
    session_id: str = "sess-123",
    content: object = "hello",
    timestamp: str = "2026-03-27T10:00:00+11:00",
    model: str = "",
    stop_reason: str = "",
    usage: dict[str, int] | None = None,
    cwd: str = "/tmp",
    git_branch: str = "main",
) -> str:
    msg: dict[str, object] = {
        "type": type,
        "sessionId": session_id,
        "timestamp": timestamp,
        "cwd": cwd,
        "gitBranch": git_branch,
        "message": {
            "role": "user" if type == "user" else "assistant",
            "content": content,
        },
    }
    inner = msg["message"]
    assert isinstance(inner, dict)
    if model:
        inner["model"] = model
    if stop_reason:
        inner["stop_reason"] = stop_reason
    if usage:
        inner["usage"] = usage
    return json.dumps(msg)


def test_parse_session_basic(tmp_path: Path) -> None:
    lines = [
        _make_jsonl_line(type="user", content="What is this?"),
        _make_jsonl_line(
            type="assistant",
            content="This is a test.",
            model="claude-opus-4-6",
            stop_reason="end_turn",
            usage={"input_tokens": 100, "output_tokens": 50},
        ),
    ]
    f = tmp_path / "test.jsonl"
    f.write_text("\n".join(lines))

    sess = parse_session(str(f))
    assert sess is not None
    assert sess.session_id == "sess-123"
    assert sess.first_prompt == "What is this?"
    assert sess.model == "claude-opus-4-6"
    assert sess.max_context_tokens == 1_000_000
    assert sess.context_tokens == 100
    assert sess.waiting_for_input is True
    assert sess.cwd == "/tmp"
    assert sess.git_branch == "main"


def test_parse_session_empty_file(tmp_path: Path) -> None:
    f = tmp_path / "empty.jsonl"
    f.write_text("")
    assert parse_session(str(f)) is None


def test_parse_session_no_session_id(tmp_path: Path) -> None:
    lines = [_make_jsonl_line(session_id="")]
    f = tmp_path / "no_id.jsonl"
    f.write_text("\n".join(lines))
    assert parse_session(str(f)) is None


def test_parse_session_malformed_lines_skipped(tmp_path: Path) -> None:
    lines = [
        "not json at all",
        _make_jsonl_line(type="user", content="real prompt"),
        "{bad json too",
    ]
    f = tmp_path / "mixed.jsonl"
    f.write_text("\n".join(lines))

    sess = parse_session(str(f))
    assert sess is not None
    assert sess.first_prompt == "real prompt"


def test_parse_session_tracks_last_user_prompt(tmp_path: Path) -> None:
    lines = [
        _make_jsonl_line(type="user", content="first"),
        _make_jsonl_line(type="user", content="second"),
        _make_jsonl_line(type="user", content="third"),
    ]
    f = tmp_path / "multi.jsonl"
    f.write_text("\n".join(lines))

    sess = parse_session(str(f))
    assert sess is not None
    assert sess.first_prompt == "first"
    assert sess.last_user_prompt == "third"


def test_parse_session_nonexistent_file() -> None:
    assert parse_session("/nonexistent/path.jsonl") is None


def test_parse_session_context_tokens_include_cache(tmp_path: Path) -> None:
    lines = [
        _make_jsonl_line(type="user", content="hi"),
        _make_jsonl_line(
            type="assistant",
            content="response",
            model="claude-sonnet-4-6",
            usage={
                "input_tokens": 50,
                "output_tokens": 20,
                "cache_creation_input_tokens": 30,
                "cache_read_input_tokens": 10,
            },
        ),
    ]
    f = tmp_path / "cache.jsonl"
    f.write_text("\n".join(lines))

    sess = parse_session(str(f))
    assert sess is not None
    # context_tokens = input(50) + cache_creation(30) + cache_read(10) = 90
    assert sess.context_tokens == 90


def test_parse_session_tool_use_not_waiting(tmp_path: Path) -> None:
    lines = [
        _make_jsonl_line(type="user", content="do something"),
        _make_jsonl_line(
            type="assistant",
            content=[{"type": "tool_use", "name": "Bash", "input": {"command": "ls"}}],
            model="claude-opus-4-6",
            stop_reason="tool_use",
            usage={"input_tokens": 50, "output_tokens": 10},
        ),
    ]
    f = tmp_path / "tool.jsonl"
    f.write_text("\n".join(lines))

    sess = parse_session(str(f))
    assert sess is not None
    assert sess.waiting_for_input is False
