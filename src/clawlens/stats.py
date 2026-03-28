"""Token usage stats aggregation with file-level caching."""

from __future__ import annotations

import glob
import logging
import os
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from clawlens.models import TokenPeriod, TokenStats

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# File-level cache
# ---------------------------------------------------------------------------


@dataclass
class _CachedFileStats:
    mod_time: float
    daily_stats: dict[str, TokenPeriod] = field(default_factory=dict)


_stats_cache: dict[str, _CachedFileStats] = {}


# ---------------------------------------------------------------------------
# Single-file parser
# ---------------------------------------------------------------------------


def parse_file_token_stats(fpath: str) -> dict[str, TokenPeriod]:
    """Parse a JSONL file and return token usage grouped by date (YYYY-MM-DD).

    Only assistant messages with non-zero usage are counted.
    Input tokens include cache_creation and cache_read tokens.
    """
    import json

    result: dict[str, TokenPeriod] = {}

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

                if raw.get("type") != "assistant":
                    continue

                usage = raw.get("message", {}).get("usage", {})
                input_tokens = usage.get("input_tokens", 0)
                output_tokens = usage.get("output_tokens", 0)
                cache_creation = usage.get("cache_creation_input_tokens", 0)
                cache_read = usage.get("cache_read_input_tokens", 0)

                if (
                    input_tokens == 0
                    and output_tokens == 0
                    and cache_creation == 0
                    and cache_read == 0
                ):
                    continue

                ts_str = raw.get("timestamp", "")
                if not ts_str:
                    continue

                try:
                    dt = datetime.fromisoformat(ts_str)
                    date_str = dt.strftime("%Y-%m-%d")
                except (ValueError, TypeError):
                    continue

                tp = result.get(date_str, TokenPeriod())
                tp.input_tokens += input_tokens + cache_creation + cache_read
                tp.output_tokens += output_tokens
                result[date_str] = tp

    except OSError:
        logger.warning("Failed to read stats file: %s", fpath)

    return result


# ---------------------------------------------------------------------------
# Aggregated stats loader
# ---------------------------------------------------------------------------


def load_token_stats() -> TokenStats:
    """Scan all session JSONL files and return token usage aggregated by period.

    Aggregates into today, this week (Monday-based), and this month.
    Uses file-level caching with mod-time invalidation.
    """
    home = os.path.expanduser("~")
    pattern = os.path.join(home, ".claude", "projects", "*", "*.jsonl")
    files = glob.glob(pattern)

    now = date.today()
    today_str = now.isoformat()

    # ISO week starts on Monday (weekday 0 = Monday in Python).
    days_since_monday = now.weekday()  # 0=Mon, 6=Sun
    week_start_str = (now - timedelta(days=days_since_monday)).isoformat()

    month_start_str = now.replace(day=1).isoformat()

    stats = TokenStats()

    for fpath in files:
        # Skip subagents directories.
        if os.sep + "subagents" + os.sep in fpath:
            continue

        try:
            st = os.stat(fpath)
        except OSError:
            continue

        mod_time = st.st_mtime

        cached = _stats_cache.get(fpath)
        if cached is not None and cached.mod_time == mod_time:
            daily_stats = cached.daily_stats
        else:
            daily_stats = parse_file_token_stats(fpath)
            _stats_cache[fpath] = _CachedFileStats(
                mod_time=mod_time, daily_stats=daily_stats
            )

        for date_str, tp in daily_stats.items():
            if date_str == today_str:
                stats.today.input_tokens += tp.input_tokens
                stats.today.output_tokens += tp.output_tokens
            if date_str >= week_start_str:
                stats.this_week.input_tokens += tp.input_tokens
                stats.this_week.output_tokens += tp.output_tokens
            if date_str >= month_start_str:
                stats.this_month.input_tokens += tp.input_tokens
                stats.this_month.output_tokens += tp.output_tokens

    return stats
