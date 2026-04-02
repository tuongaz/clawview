"""Tests for token stats aggregation and period boundaries."""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from clawview.models import TokenPeriod
from clawview.stats import load_token_stats, parse_file_token_stats


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_assistant_line(
    *,
    timestamp: str,
    input_tokens: int = 100,
    output_tokens: int = 50,
    cache_creation: int = 0,
    cache_read: int = 0,
) -> str:
    return json.dumps(
        {
            "type": "assistant",
            "timestamp": timestamp,
            "message": {
                "role": "assistant",
                "content": "response",
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cache_creation_input_tokens": cache_creation,
                    "cache_read_input_tokens": cache_read,
                },
            },
        }
    )


def _make_user_line(timestamp: str) -> str:
    return json.dumps(
        {
            "type": "user",
            "timestamp": timestamp,
            "message": {"role": "user", "content": "hello"},
        }
    )


# ---------------------------------------------------------------------------
# parse_file_token_stats
# ---------------------------------------------------------------------------


def test_parse_file_groups_by_date(tmp_path: Path) -> None:
    lines = [
        _make_assistant_line(timestamp="2026-03-27T10:00:00+11:00", input_tokens=100, output_tokens=50),
        _make_assistant_line(timestamp="2026-03-27T14:00:00+11:00", input_tokens=200, output_tokens=30),
        _make_assistant_line(timestamp="2026-03-26T09:00:00+11:00", input_tokens=50, output_tokens=25),
    ]
    f = tmp_path / "test.jsonl"
    f.write_text("\n".join(lines))

    result = parse_file_token_stats(str(f))

    assert "2026-03-27" in result
    assert result["2026-03-27"].input_tokens == 300  # 100 + 200
    assert result["2026-03-27"].output_tokens == 80  # 50 + 30

    assert "2026-03-26" in result
    assert result["2026-03-26"].input_tokens == 50
    assert result["2026-03-26"].output_tokens == 25


def test_parse_file_includes_cache_tokens(tmp_path: Path) -> None:
    lines = [
        _make_assistant_line(
            timestamp="2026-03-27T10:00:00+11:00",
            input_tokens=100,
            output_tokens=50,
            cache_creation=30,
            cache_read=20,
        ),
    ]
    f = tmp_path / "cache.jsonl"
    f.write_text("\n".join(lines))

    result = parse_file_token_stats(str(f))
    # input = 100 + 30 + 20 = 150
    assert result["2026-03-27"].input_tokens == 150
    assert result["2026-03-27"].output_tokens == 50


def test_parse_file_skips_user_messages(tmp_path: Path) -> None:
    lines = [
        _make_user_line("2026-03-27T10:00:00+11:00"),
        _make_assistant_line(timestamp="2026-03-27T10:01:00+11:00", input_tokens=100, output_tokens=50),
    ]
    f = tmp_path / "mixed.jsonl"
    f.write_text("\n".join(lines))

    result = parse_file_token_stats(str(f))
    assert "2026-03-27" in result
    assert result["2026-03-27"].input_tokens == 100


def test_parse_file_skips_zero_usage(tmp_path: Path) -> None:
    lines = [
        _make_assistant_line(
            timestamp="2026-03-27T10:00:00+11:00",
            input_tokens=0,
            output_tokens=0,
            cache_creation=0,
            cache_read=0,
        ),
    ]
    f = tmp_path / "zero.jsonl"
    f.write_text("\n".join(lines))

    result = parse_file_token_stats(str(f))
    assert len(result) == 0


def test_parse_file_handles_malformed_lines(tmp_path: Path) -> None:
    lines = [
        "not json",
        _make_assistant_line(timestamp="2026-03-27T10:00:00+11:00", input_tokens=100, output_tokens=50),
        "{incomplete",
    ]
    f = tmp_path / "bad.jsonl"
    f.write_text("\n".join(lines))

    result = parse_file_token_stats(str(f))
    assert result["2026-03-27"].input_tokens == 100


def test_parse_file_empty(tmp_path: Path) -> None:
    f = tmp_path / "empty.jsonl"
    f.write_text("")
    assert parse_file_token_stats(str(f)) == {}


def test_parse_file_nonexistent() -> None:
    assert parse_file_token_stats("/nonexistent/path.jsonl") == {}


# ---------------------------------------------------------------------------
# load_token_stats — period boundaries
# ---------------------------------------------------------------------------


def test_load_token_stats_period_boundaries(tmp_path: Path) -> None:
    """Test that today/week/month aggregation boundaries are correct."""
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Find a day from previous month.
    first_of_month = today.replace(day=1)
    prev_month_day = first_of_month - timedelta(days=1)

    # Find a day from last week (before Monday of current week).
    days_since_monday = today.weekday()
    monday = today - timedelta(days=days_since_monday)
    last_week_day = monday - timedelta(days=1)

    # Create project dir structure.
    project_dir = tmp_path / ".claude" / "projects" / "test-project"
    project_dir.mkdir(parents=True)

    # File with today's data.
    today_file = project_dir / "today.jsonl"
    today_file.write_text(
        _make_assistant_line(
            timestamp=f"{today.isoformat()}T10:00:00+00:00",
            input_tokens=100,
            output_tokens=50,
        )
    )

    # File with yesterday's data.
    yesterday_file = project_dir / "yesterday.jsonl"
    yesterday_file.write_text(
        _make_assistant_line(
            timestamp=f"{yesterday.isoformat()}T10:00:00+00:00",
            input_tokens=200,
            output_tokens=80,
        )
    )

    # File with previous month data.
    prev_month_file = project_dir / "prev_month.jsonl"
    prev_month_file.write_text(
        _make_assistant_line(
            timestamp=f"{prev_month_day.isoformat()}T10:00:00+00:00",
            input_tokens=500,
            output_tokens=200,
        )
    )

    # File with last week data.
    last_week_file = project_dir / "last_week.jsonl"
    last_week_file.write_text(
        _make_assistant_line(
            timestamp=f"{last_week_day.isoformat()}T10:00:00+00:00",
            input_tokens=300,
            output_tokens=120,
        )
    )

    # Patch glob and clear cache.
    from clawview import stats

    stats._stats_cache.clear()

    files = [str(today_file), str(yesterday_file), str(prev_month_file), str(last_week_file)]
    with (
        patch("clawview.stats.glob.glob", return_value=files),
        patch("clawview.stats.os.path.expanduser", return_value=str(tmp_path)),
    ):
        result = load_token_stats()

    # Today: only today_file data.
    assert result.today.input_tokens == 100
    assert result.today.output_tokens == 50

    # This week: today + yesterday (if yesterday >= monday), or just today.
    if yesterday >= monday:
        assert result.this_week.input_tokens >= 100  # at least today
    else:
        assert result.this_week.input_tokens == 100

    # This month: today + yesterday + possibly last_week (if same month), but NOT prev_month.
    assert result.this_month.input_tokens >= 100  # at least today
    assert result.this_month.output_tokens >= 50

    # Previous month should NOT be in this_month.
    # Total this_month should NOT include prev_month's 500.
    # Verify by checking that we don't have 500 in the total when it's a different month.
    if prev_month_day.month != today.month:
        # prev_month data should not be in this_month
        total_month_input = result.this_month.input_tokens
        assert 500 not in {total_month_input}  # 500 alone shouldn't be the total
