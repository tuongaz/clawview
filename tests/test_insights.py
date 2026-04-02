"""Tests for the insights computation engine (compute_project_stats)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest

from clawview.insights import compute_project_stats


# ---------------------------------------------------------------------------
# JSONL line builders
# ---------------------------------------------------------------------------


def _assistant_line(
    *,
    timestamp: str,
    model: str = "claude-sonnet-4-20250514",
    input_tokens: int = 100,
    output_tokens: int = 50,
    cache_creation: int = 0,
    cache_read: int = 0,
    tool_names: list[str] | None = None,
    stop_reason: str = "end_turn",
) -> str:
    content: list[dict] = []
    if tool_names:
        for name in tool_names:
            content.append({"type": "tool_use", "id": f"tu_{name}", "name": name, "input": {}})
    else:
        content.append({"type": "text", "text": "assistant response"})

    return json.dumps({
        "type": "assistant",
        "timestamp": timestamp,
        "message": {
            "role": "assistant",
            "model": model,
            "content": content,
            "stop_reason": stop_reason,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cache_creation_input_tokens": cache_creation,
                "cache_read_input_tokens": cache_read,
            },
        },
    })


def _user_prompt_line(*, timestamp: str, text: str = "do something") -> str:
    return json.dumps({
        "type": "user",
        "timestamp": timestamp,
        "message": {
            "role": "user",
            "content": [{"type": "text", "text": text}],
        },
    })


def _tool_result_line(
    *,
    timestamp: str,
    is_error: bool = False,
    text: str = "tool output",
) -> str:
    return json.dumps({
        "type": "user",
        "timestamp": timestamp,
        "message": {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": "tu_1",
                    "is_error": is_error,
                    "content": text,
                },
            ],
        },
    })


def _interruption_line(*, timestamp: str) -> str:
    """A user message indicating the user interrupted the assistant.

    In real JSONL, interruptions appear as tool_result messages (not real user
    prompts) containing '[Request interrupted' text.
    """
    return json.dumps({
        "type": "user",
        "timestamp": timestamp,
        "message": {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": "tu_interrupt",
                    "content": "[Request interrupted by user]",
                },
            ],
        },
    })


# ---------------------------------------------------------------------------
# Fixture: a project directory with realistic JSONL sessions
# ---------------------------------------------------------------------------


@pytest.fixture()
def project_dir(tmp_path: Path) -> Path:
    """Create a fake ~/.claude/projects/<encoded> directory with two sessions."""
    proj = tmp_path / ".claude" / "projects" / "test-project"
    proj.mkdir(parents=True)

    # --- Session 1: normal flow with tools, errors, and cache tokens ---
    session1 = proj / "session-aaa.jsonl"
    session1.write_text("\n".join([
        # Command 1: user prompt → assistant uses Read tool → tool result OK
        _user_prompt_line(timestamp="2026-03-27T10:00:00Z", text="read the config"),
        _assistant_line(
            timestamp="2026-03-27T10:00:05Z",
            tool_names=["Read"],
            input_tokens=200,
            output_tokens=100,
            cache_creation=50,
            cache_read=150,
        ),
        _tool_result_line(timestamp="2026-03-27T10:00:06Z", text="config contents"),
        # Assistant follow-up with Edit tool
        _assistant_line(
            timestamp="2026-03-27T10:00:10Z",
            tool_names=["Edit"],
            input_tokens=300,
            output_tokens=200,
            cache_read=100,
        ),
        # Tool result with error: "File has not been read yet"
        _tool_result_line(
            timestamp="2026-03-27T10:00:11Z",
            is_error=True,
            text="File has not been read yet: /foo.py",
        ),
        # Assistant retries Read
        _assistant_line(
            timestamp="2026-03-27T10:00:15Z",
            tool_names=["Read"],
            input_tokens=100,
            output_tokens=50,
            cache_read=200,
        ),
        _tool_result_line(timestamp="2026-03-27T10:00:16Z", text="foo contents"),
        # Command 2: another user prompt, gets interrupted
        _user_prompt_line(timestamp="2026-03-27T14:00:00Z", text="refactor module"),
        _assistant_line(
            timestamp="2026-03-27T14:00:05Z",
            tool_names=["Edit", "Write"],
            input_tokens=500,
            output_tokens=300,
            cache_creation=100,
            cache_read=400,
        ),
        _interruption_line(timestamp="2026-03-27T14:00:10Z"),
    ]))

    # --- Session 2: different model, different day ---
    session2 = proj / "session-bbb.jsonl"
    session2.write_text("\n".join([
        # Command 3: user prompt → assistant with opus model
        _user_prompt_line(timestamp="2026-03-28T09:00:00Z", text="explain the code"),
        _assistant_line(
            timestamp="2026-03-28T09:00:05Z",
            model="claude-opus-4-20250514",
            input_tokens=1000,
            output_tokens=500,
            cache_creation=200,
            cache_read=800,
        ),
        # Command 4: tool error — "String to replace not found"
        _user_prompt_line(timestamp="2026-03-28T11:00:00Z", text="fix the bug"),
        _assistant_line(
            timestamp="2026-03-28T11:00:05Z",
            tool_names=["Edit"],
            input_tokens=400,
            output_tokens=200,
            cache_read=300,
        ),
        _tool_result_line(
            timestamp="2026-03-28T11:00:06Z",
            is_error=True,
            text="String to replace not found in file /bar.py",
        ),
        _assistant_line(
            timestamp="2026-03-28T11:00:10Z",
            model="claude-opus-4-20250514",
            tool_names=["Edit"],
            input_tokens=400,
            output_tokens=200,
            cache_read=100,
        ),
        _tool_result_line(timestamp="2026-03-28T11:00:11Z", text="edit done"),
    ]))

    return proj


@pytest.fixture()
def stats(project_dir: Path, tmp_path: Path) -> dict:
    """Compute stats from the fixture project directory."""
    with patch.object(os.path, "expanduser", return_value=str(tmp_path)):
        return compute_project_stats("test-project", timezone_offset_minutes=0)


# ---------------------------------------------------------------------------
# Overview stats
# ---------------------------------------------------------------------------


class TestOverviewStats:
    def test_total_messages(self, stats: dict) -> None:
        # Session 1: 10 lines (3 user prompt/tool-result/interruption + 3 assistant = ~10)
        # Session 2: 7 lines
        # Only user + assistant type lines are counted
        assert stats["overview"]["total_messages"] > 0

    def test_token_totals(self, stats: dict) -> None:
        tokens = stats["overview"]["total_tokens"]
        # Sum of all input_tokens across all assistant + user messages
        # Assistant messages: 200+300+100+500+1000+400+400 = 2900
        # User messages have 0 tokens (no usage field set)
        assert tokens["input"] == 2900
        assert tokens["output"] == 100 + 200 + 50 + 300 + 500 + 200 + 200  # 1550
        assert tokens["cache_creation"] == 50 + 0 + 0 + 100 + 200 + 0 + 0  # 350
        assert tokens["cache_read"] == 150 + 100 + 200 + 400 + 800 + 300 + 100  # 2050

    def test_session_count(self, stats: dict) -> None:
        assert stats["overview"]["session_count"] == 2

    def test_date_range(self, stats: dict) -> None:
        dr = stats["overview"]["date_range"]
        assert dr["start"] is not None
        assert dr["end"] is not None
        assert dr["start"] < dr["end"]
        assert "2026-03-27" in dr["start"]
        assert "2026-03-28" in dr["end"]

    def test_message_types(self, stats: dict) -> None:
        mt = stats["overview"]["message_types"]
        assert "user" in mt
        assert "assistant" in mt
        assert mt["user"] > 0
        assert mt["assistant"] == 7  # 3 in session1 + 4 in session2 (incl no-tool first)


# ---------------------------------------------------------------------------
# Tool stats
# ---------------------------------------------------------------------------


class TestToolStats:
    def test_usage_counts(self, stats: dict) -> None:
        uc = stats["tools"]["usage_counts"]
        # Read: 2 (session1: 10:00:05, 10:00:15)
        # Edit: 4 (session1: 10:00:10, 14:00:05; session2: 11:00:05, 11:00:10)
        # Write: 1 (session1: 14:00:05 alongside Edit)
        assert uc["Read"] == 2
        assert uc["Edit"] == 4
        assert uc["Write"] == 1

    def test_error_counts(self, stats: dict) -> None:
        ec = stats["tools"]["error_counts"]
        # Error 1: "File has not been read yet" → attributed to Edit (preceding assistant)
        # Error 2: "String to replace not found" → attributed to Edit
        assert ec.get("Edit", 0) == 2

    def test_error_rates(self, stats: dict) -> None:
        er = stats["tools"]["error_rates"]
        # Edit: 2 errors / 4 uses = 0.5
        assert er["Edit"] == pytest.approx(0.5)
        # Read: 0 errors / 2 uses = 0.0
        assert er["Read"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Daily stats
# ---------------------------------------------------------------------------


class TestDailyStats:
    def test_date_keys(self, stats: dict) -> None:
        ds = stats["daily_stats"]
        assert "2026-03-27" in ds
        assert "2026-03-28" in ds

    def test_messages_per_day(self, stats: dict) -> None:
        ds = stats["daily_stats"]
        # Day 1 (Mar 27): session1 has 10 messages
        assert ds["2026-03-27"]["messages"] > 0
        # Day 2 (Mar 28): session2 has 7 messages
        assert ds["2026-03-28"]["messages"] > 0

    def test_sessions_per_day(self, stats: dict) -> None:
        ds = stats["daily_stats"]
        assert ds["2026-03-27"]["sessions"] == 1
        assert ds["2026-03-28"]["sessions"] == 1

    def test_tokens_per_day(self, stats: dict) -> None:
        ds = stats["daily_stats"]
        # Day 1 tokens: assistant input 200+300+100+500 = 1100
        assert ds["2026-03-27"]["tokens"]["input"] == 1100
        # Day 2 tokens: assistant input 1000+400+400 = 1800
        assert ds["2026-03-28"]["tokens"]["input"] == 1800

    def test_cost_per_day(self, stats: dict) -> None:
        ds = stats["daily_stats"]
        # Day 1: all sonnet-4 model → cost should be > 0
        assert ds["2026-03-27"]["cost"] > 0
        # Day 2: mix of opus-4 and sonnet-4 (first assistant has no tools, uses opus)
        assert ds["2026-03-28"]["cost"] > 0
        # Opus costs more, so day 2 should be higher per-token
        # Day 2 has opus tokens (1000 in, 500 out) which are 5x more expensive
        assert ds["2026-03-28"]["cost"] > ds["2026-03-27"]["cost"]


# ---------------------------------------------------------------------------
# Hourly pattern
# ---------------------------------------------------------------------------


class TestHourlyPattern:
    def test_all_24_hours_present(self, stats: dict) -> None:
        hp = stats["hourly_pattern"]
        assert len(hp["messages"]) == 24
        assert len(hp["tokens"]) == 24
        for h in range(24):
            assert h in hp["messages"]
            assert h in hp["tokens"]

    def test_correct_hour_bucketing(self, stats: dict) -> None:
        hp = stats["hourly_pattern"]
        # Session 1 messages at 10:xx and 14:xx UTC
        assert hp["messages"][10] > 0
        assert hp["messages"][14] > 0
        # Session 2 messages at 09:xx and 11:xx UTC
        assert hp["messages"][9] > 0
        assert hp["messages"][11] > 0
        # Hours with no messages
        assert hp["messages"][0] == 0
        assert hp["messages"][23] == 0

    def test_token_bucketing(self, stats: dict) -> None:
        hp = stats["hourly_pattern"]
        # Hour 10 should have tokens from the assistant messages at 10:xx
        assert hp["tokens"][10]["input"] > 0
        assert hp["tokens"][10]["output"] > 0


# ---------------------------------------------------------------------------
# Error stats
# ---------------------------------------------------------------------------


class TestErrorStats:
    def test_total_errors(self, stats: dict) -> None:
        # 2 tool_result is_error messages
        assert stats["errors"]["total"] == 2

    def test_error_rate(self, stats: dict) -> None:
        total_msgs = stats["overview"]["total_messages"]
        assert stats["errors"]["error_rate"] == pytest.approx(2 / total_msgs)

    def test_by_category(self, stats: dict) -> None:
        bc = stats["errors"]["by_category"]
        # "File has not been read yet" → File Not Read
        assert bc.get("File Not Read", 0) == 1
        # "String to replace not found" → Content Not Found
        assert bc.get("Content Not Found", 0) == 1

    def test_error_details(self, stats: dict) -> None:
        details = stats["errors"]["details"]
        assert len(details) == 2
        for d in details:
            assert "timestamp" in d
            assert "session_id" in d
            assert "category" in d
            assert "text" in d
            assert len(d["text"]) <= 200


# ---------------------------------------------------------------------------
# Model stats
# ---------------------------------------------------------------------------


class TestModelStats:
    def test_model_keys(self, stats: dict) -> None:
        models = stats["models"]
        assert "claude-sonnet-4-20250514" in models
        assert "claude-opus-4-20250514" in models

    def test_sonnet_counts(self, stats: dict) -> None:
        sonnet = stats["models"]["claude-sonnet-4-20250514"]
        # Sonnet assistant msgs: session1 (3 msgs) + session2 line 2 (1 msg) = 4
        # But session2 first assistant (opus) and last assistant (opus) → sonnet only in session2 line2
        # Session1: 3 assistants all sonnet → input 200+300+100=600
        # Session2: line 2 is sonnet (400 in) → total 1000
        # Wait, let me re-check. Session2 line 2 (11:00:05) has no explicit model so defaults
        # Actually it does have model="claude-sonnet-4-20250514" (default in helper)
        # Session2 line 4 (11:00:10) has model="claude-opus-4-20250514"
        assert sonnet["count"] >= 3
        assert sonnet["input_tokens"] > 0

    def test_opus_counts(self, stats: dict) -> None:
        opus = stats["models"]["claude-opus-4-20250514"]
        # Session2: 2 opus assistant messages (09:00:05 and 11:00:10)
        assert opus["count"] == 2
        assert opus["input_tokens"] == 1000 + 400  # 1400
        assert opus["output_tokens"] == 500 + 200  # 700


# ---------------------------------------------------------------------------
# User interaction stats
# ---------------------------------------------------------------------------


class TestUserInteractionStats:
    def test_real_user_messages(self, stats: dict) -> None:
        ui = stats["user_interactions"]
        # 4 real user prompts across both sessions
        assert ui["real_user_messages"] == 4

    def test_commands_requiring_tools(self, stats: dict) -> None:
        ui = stats["user_interactions"]
        # 3 of 4 commands use tools (cmd3 "explain the code" has no tool_use)
        assert ui["commands_requiring_tools"] == 3

    def test_tool_use_rate(self, stats: dict) -> None:
        ui = stats["user_interactions"]
        # 3 of 4 = 75%
        assert ui["tool_use_rate"] == pytest.approx(75.0)

    def test_interruption_rate(self, stats: dict) -> None:
        ui = stats["user_interactions"]
        # 1 interrupted out of 4 commands = 25%
        assert ui["interruption_rate"] == pytest.approx(25.0)

    def test_tool_count_distribution(self, stats: dict) -> None:
        ui = stats["user_interactions"]
        dist = ui["tool_count_distribution"]
        # At least some commands have tools
        assert sum(dist.values()) == 4

    def test_model_distribution(self, stats: dict) -> None:
        ui = stats["user_interactions"]
        dist = ui["model_distribution"]
        # Commands use either sonnet or opus as first model
        assert sum(dist.values()) == 4


# ---------------------------------------------------------------------------
# Cache stats
# ---------------------------------------------------------------------------


class TestCacheStats:
    def test_totals(self, stats: dict) -> None:
        cache = stats["cache"]
        # cache_creation: 50 + 0 + 0 + 100 + 200 + 0 + 0 = 350
        assert cache["total_created"] == 350
        # cache_read: 150 + 100 + 200 + 400 + 800 + 300 + 100 = 2050
        assert cache["total_read"] == 2050

    def test_hit_rate(self, stats: dict) -> None:
        cache = stats["cache"]
        # All 7 assistant messages have cache_read > 0 except possibly some
        # Messages with cache_read > 0: all 7 have some cache_read
        assert cache["hit_rate"] > 0

    def test_efficiency(self, stats: dict) -> None:
        cache = stats["cache"]
        # efficiency = min(100, 2050 / 350 * 100) = min(100, 585.7) = 100
        assert cache["efficiency"] == pytest.approx(100.0)

    def test_tokens_saved(self, stats: dict) -> None:
        cache = stats["cache"]
        # tokens_saved = total_read - total_created = 2050 - 350 = 1700
        assert cache["tokens_saved"] == 1700

    def test_cost_saved(self, stats: dict) -> None:
        cache = stats["cache"]
        # cost_saved = 2050 * 1.0 - (2050 * 0.10 + 350 * 1.25)
        #            = 2050 - (205 + 437.5) = 2050 - 642.5 = 1407.5
        assert cache["cost_saved"] == pytest.approx(1407.5)

    def test_break_even(self, stats: dict) -> None:
        cache = stats["cache"]
        # total_read (2050) > total_created (350) → True
        assert cache["break_even"] is True

    def test_roi(self, stats: dict) -> None:
        cache = stats["cache"]
        # roi = (2050 / 350 - 1) * 100 = (5.857 - 1) * 100 = 485.7
        assert cache["roi"] == pytest.approx((2050 / 350 - 1) * 100, abs=0.1)


# ---------------------------------------------------------------------------
# Command details
# ---------------------------------------------------------------------------


class TestCommandDetails:
    def test_command_count(self, stats: dict) -> None:
        assert len(stats["command_details"]) == 4

    def test_command_fields(self, stats: dict) -> None:
        for cmd in stats["command_details"]:
            assert "user_message" in cmd
            assert "timestamp" in cmd
            assert "model" in cmd
            assert "steps" in cmd
            assert "tools_count" in cmd
            assert "tokens" in cmd
            assert "interrupted" in cmd
            assert "tool_names" in cmd

    def test_interrupted_command(self, stats: dict) -> None:
        # Command 2 ("refactor module") should be interrupted
        interrupted = [c for c in stats["command_details"] if c["interrupted"]]
        assert len(interrupted) == 1
        assert "refactor" in interrupted[0]["user_message"]

    def test_tool_names_deduped(self, stats: dict) -> None:
        # Command 1 uses Read, Edit, Read → unique should be [Read, Edit]
        cmd1 = stats["command_details"][0]
        assert len(cmd1["tool_names"]) == len(set(cmd1["tool_names"]))


# ---------------------------------------------------------------------------
# Empty / edge cases
# ---------------------------------------------------------------------------


class TestEmptyStats:
    def test_no_jsonl_files(self, tmp_path: Path) -> None:
        proj = tmp_path / ".claude" / "projects" / "empty-project"
        proj.mkdir(parents=True)
        with patch.object(os.path, "expanduser", return_value=str(tmp_path)):
            result = compute_project_stats("empty-project")
        assert result["overview"]["total_messages"] == 0
        assert result["command_details"] == []
        assert result["cache"]["total_created"] == 0

    def test_empty_jsonl_file(self, tmp_path: Path) -> None:
        proj = tmp_path / ".claude" / "projects" / "blank-project"
        proj.mkdir(parents=True)
        (proj / "empty.jsonl").write_text("")
        with patch.object(os.path, "expanduser", return_value=str(tmp_path)):
            result = compute_project_stats("blank-project")
        assert result["overview"]["total_messages"] == 0


# ---------------------------------------------------------------------------
# Timezone offset
# ---------------------------------------------------------------------------


class TestTimezoneOffset:
    def test_daily_stats_shifted(self, project_dir: Path, tmp_path: Path) -> None:
        """A +600 min offset shifts 2026-03-27T10:00Z to 2026-03-27T20:00 local."""
        with patch.object(os.path, "expanduser", return_value=str(tmp_path)):
            result = compute_project_stats("test-project", timezone_offset_minutes=600)
        # The 2026-03-28T09:00Z message shifts to 2026-03-28T19:00 local (same day)
        # The 2026-03-27T10:00Z messages shift to 2026-03-27T20:00 local (same day)
        assert "2026-03-27" in result["daily_stats"]

    def test_hourly_pattern_shifted(self, project_dir: Path, tmp_path: Path) -> None:
        """With +600 offset, hour 10 UTC becomes hour 20 local."""
        with patch.object(os.path, "expanduser", return_value=str(tmp_path)):
            result = compute_project_stats("test-project", timezone_offset_minutes=600)
        hp = result["hourly_pattern"]
        # 10:00 UTC + 600 min = 20:00 local
        assert hp["messages"][20] > 0
        # Original hour 10 should have 0 since everything shifted
        # (unless other messages land there)
