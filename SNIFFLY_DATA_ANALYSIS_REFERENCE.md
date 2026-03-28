# Sniffly - Claude Code Analytics: Data & Feature Reference

> **Purpose**: This document is an engineering reference for rebuilding the Sniffly analytics application. It details every piece of data extracted from Claude Code session logs, how that data is processed, and every feature the application provides.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Source: Claude Code JSONL Session Logs](#2-data-source-claude-code-jsonl-session-logs)
3. [Log Discovery & Project Detection](#3-log-discovery--project-detection)
4. [JSONL Record Format](#4-jsonl-record-format)
5. [Core Processing Pipeline](#5-core-processing-pipeline)
6. [Statistics Computation](#6-statistics-computation)
7. [Pricing & Cost Calculation](#7-pricing--cost-calculation)
8. [Global Cross-Project Aggregation](#8-global-cross-project-aggregation)
9. [Caching Architecture](#9-caching-architecture)
10. [API Endpoints](#10-api-endpoints)
11. [Frontend Features](#11-frontend-features)
12. [Dashboard Charts (12 Total)](#12-dashboard-charts-12-total)
13. [Dashboard Stat Cards (6 Total)](#13-dashboard-stat-cards-6-total)
14. [Data Tables & Tabs](#14-data-tables--tabs)
15. [Export & Sharing](#15-export--sharing)
16. [Configuration](#16-configuration)
17. [CLI Interface](#17-cli-interface)

---

## 1. Architecture Overview

| Layer | Technology | Location |
|-------|-----------|----------|
| **Backend** | Python / FastAPI / Uvicorn | `sniffly/` |
| **Frontend** | Vanilla JS + Chart.js (no framework) | `sniffly/static/js/`, `sniffly/templates/` |
| **Data Source** | Claude Code JSONL session files | `~/.claude/projects/` |
| **Caching** | Two-tier: L1 in-memory LRU + L2 disk JSON | `~/.sniffly/cache/` |
| **Pricing** | LiteLLM dynamic + hardcoded fallback | `sniffly/utils/pricing.py` |

**Key code references:**
- Server: `sniffly/server.py`
- Core processor: `sniffly/core/processor.py`
- Statistics: `sniffly/core/stats.py`
- Log finder: `sniffly/utils/log_finder.py`
- Config: `sniffly/config.py`
- CLI: `sniffly/cli.py`

---

## 2. Data Source: Claude Code JSONL Session Logs

Sniffly reads JSONL (JSON Lines) files produced by Claude Code CLI sessions. These files are stored at:

```
~/.claude/projects/<encoded-project-path>/*.jsonl
```

### Path Encoding

Claude Code encodes project paths by replacing `/` with `-`:

| Actual Project Path | Encoded Directory Name |
|---------------------|----------------------|
| `/Users/john/dev/myapp` | `-Users-john-dev-myapp` |
| `/Users/john/dev/myapp` | `Users-john-dev-myapp` (legacy, no leading dash) |

Each directory may contain multiple `.jsonl` files, each representing a session or continuation.

**Code reference:** `sniffly/utils/log_finder.py` - `find_claude_logs()`, `get_all_projects_with_metadata()`

---

## 3. Log Discovery & Project Detection

### Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `find_claude_logs(project_path)` | Locate log dir for a given project | String path or None |
| `get_all_projects_with_metadata()` | Get all projects with metadata | List of project dicts |
| `validate_project_path(project_path)` | Check path exists and has logs | `(bool, str)` |

### Per-Project Metadata Extracted

| Field | Type | Description |
|-------|------|-------------|
| `dir_name` | str | Raw directory name |
| `display_name` | str | Human-readable project name |
| `log_path` | str | Absolute path to log directory |
| `file_count` | int | Number of JSONL files |
| `total_size_mb` | float | Total JSONL size in MB |
| `last_modified` | float | Unix timestamp of most recent file |
| `first_seen` | float | Unix timestamp of earliest file |

**Code reference:** `sniffly/utils/log_finder.py`

---

## 4. JSONL Record Format

Each line in a `.jsonl` file is a JSON object. The processor handles these record/message types:

### Message Types

| Type | Identifier | Description |
|------|-----------|-------------|
| `user` | `data["type"] == "user"` | User messages from Claude Code |
| `assistant` | `data["type"] == "assistant"` | Claude's responses |
| `task` | `data["isSidechain"] == true && data["type"] == "user"` | Task tool (subagent) invocations |
| `summary` | `data.get("type") == "summary"` | Session summary entries |
| `compact_summary` | `data.get("isCompactSummary") == true` | Compact session summaries at boundaries |

### Standard JSONL Record Fields

```json
{
  "type": "user" | "assistant",
  "isSidechain": false,
  "isCompactSummary": false,
  "uuid": "unique-message-id",
  "parentUuid": "parent-message-id",
  "timestamp": "2024-03-28T10:30:45Z",
  "cwd": "/Users/john/dev/myapp",
  "message": {
    "id": "msg_id",
    "role": "user" | "assistant",
    "content": "text" | [
      {"type": "text", "text": "..."},
      {"type": "tool_use", "name": "Read", "id": "tool_id", "input": {"file_path": "..."}},
      {"type": "tool_result", "content": "...", "is_error": false}
    ],
    "model": "claude-3-5-sonnet-20241022",
    "usage": {
      "input_tokens": 1234,
      "output_tokens": 567,
      "cache_creation_input_tokens": 100,
      "cache_read_input_tokens": 800
    },
    "stop_reason": "end_turn" | "stop_sequence" | "tool_use"
  },
  "toolUseResult": {
    "filePath": "/path/to/file",
    "stdout": "command output",
    "interrupted": false
  },
  "summary": "Session summary text (for summary type)",
  "leafUuid": "leaf-message-reference (for summary type)"
}
```

### Processed Message Structure (Output)

After processing, each message is normalized to this structure:

```python
{
    "session_id": str,              # From filename
    "type": str,                    # user/assistant/task/summary/compact_summary
    "timestamp": str,               # ISO format
    "model": str,                   # e.g., "claude-3-5-sonnet-20241022"
    "content": str,                 # Full message text
    "tools": [                      # Tool invocations
        {
            "name": str,            # Tool name (Read, Write, Edit, Bash, Task, etc.)
            "id": str,              # Unique tool invocation ID
            "input": dict           # Tool parameters
        }
    ],
    "tokens": {
        "input": int,
        "output": int,
        "cache_creation": int,
        "cache_read": int
    },
    "cwd": str,                     # Current working directory
    "uuid": str,                    # Unique message ID
    "parent_uuid": str | None,      # Parent message reference
    "is_sidechain": bool,           # Task tool invocation flag
    "has_tool_result": bool,        # Contains tool results
    "error": bool,                  # Error indicator
    "message_id": str,              # (assistant only) Streaming message ID
    "is_interruption": bool,        # (summary only) If interrupted
    "leaf_uuid": str                # (summary only) Leaf message reference
}
```

**Code reference:** `sniffly/core/processor.py` - `_extract_message()`, `_extract_content()`

---

## 5. Core Processing Pipeline

The processor executes a 13-phase pipeline in `process_logs()`:

| Phase | Method | Purpose |
|-------|--------|---------|
| 1 | `_detect_session_continuations()` | Identify cross-session continuations via `isCompactSummary` or "continue" command |
| 2 | `_process_file()` | Parse JSONL line-by-line with `orjson.loads()`, classify messages |
| 3 | `_merge_and_deduplicate_streaming()` | Merge streaming assistant messages by message ID |
| 4 | Separate summaries | Split `summary`/`compact_summary` from regular messages |
| 5 | `_group_into_interactions()` | Group messages into user-assistant Interaction objects |
| 6 | `_handle_split_interactions()` | Merge interactions spanning file boundaries |
| 7 | `_merge_duplicate_interactions()` | Deduplicate interactions by `interaction_id` |
| 8 | `_reconcile_all_tool_counts()` | Verify tool counts match tool results |
| 9 | `_interactions_to_messages()` | Convert Interaction objects back to message list |
| 10 | Combine with summaries | Recombine all message types |
| 11 | `_deduplicate_all_messages()` | Cross-session deduplication |
| 12 | Sort and limit | Reverse chronological ordering |
| 13 | `StatisticsGenerator` | Generate comprehensive statistics |

### Deduplication Details

**Level 1 - Streaming Merge**: Groups assistant messages by `message.id`, merges tools (dedup by ID), sums tokens, calculates duration.

**Level 2 - Cross-Session Dedup**: Uses composite key:
```
Regular messages: f"{type}:{timestamp}:{content[:500]}:{uuid}"
Summaries:        f"{type}:{timestamp}:{content[:200]}"
```

**Level 3 - Interaction Merge**: Groups by `interaction_id` (derived from timestamp + content hash), keeps highest `completeness_score` copy.

### Interaction Object

```python
class Interaction:
    user_message: dict              # Initiating user message
    assistant_messages: list[dict]  # All assistant responses
    tool_results: list[dict]        # Tool result messages
    session_id: str
    start_time: str
    end_time: str
    interaction_id: str             # timestamp + content hash
    is_continuation: bool           # Cross-session continuation
    model: str
    tools_used: list[dict]          # Deduplicated tools
    final_tool_count: int           # Reconciled tool count
    has_task_tool: bool             # Whether Task tool was used
```

### Session Continuation Detection

Stored in `.continuation_cache.json` per project. Checks first 5 messages of each file for:
- `isCompactSummary` indicator
- "continue" command (exact match)

**Code reference:** `sniffly/core/processor.py`

---

## 6. Statistics Computation

The `StatisticsGenerator` produces a comprehensive stats dictionary with 9 sections:

### 6.1 Overview Statistics

| Field | Type | Description |
|-------|------|-------------|
| `project_name` | str | Extracted from log directory path |
| `log_dir_name` | str | Full directory name |
| `project_path` | str | Full log directory path |
| `total_messages` | int | Count of all messages |
| `date_range` | dict | `{start, end}` ISO timestamps |
| `sessions` | int | Unique session count |
| `message_types` | dict | Count per type (user, assistant, task, summary, compact_summary) |
| `total_tokens` | dict | `{input, output, cache_read, cache_creation}` |
| `total_cost` | float | Total project cost in USD |

### 6.2 Tool Statistics

| Field | Type | Description |
|-------|------|-------------|
| `usage_counts` | dict | `{tool_name: count}` for all tools |
| `error_counts` | dict | Error count per tool |
| `error_rates` | dict | Error rate (errors/total) per tool |

### 6.3 Session Statistics

| Field | Type | Description |
|-------|------|-------------|
| `count` | int | Number of unique sessions |
| `average_duration_seconds` | float | Mean session duration |
| `average_messages` | float | Mean messages per session |
| `sessions_with_errors` | int | Sessions containing errors |

### 6.4 Daily Statistics

Per-day breakdown (key = `YYYY-MM-DD` in local timezone):

| Field | Type | Description |
|-------|------|-------------|
| `messages` | int | Total messages that day |
| `sessions` | int | Unique sessions that day |
| `tokens` | dict | `{input, output, cache_creation, cache_read}` |
| `cost.total` | float | Total cost |
| `cost.by_model` | dict | Per-model: `{input_cost, output_cost, cache_creation_cost, cache_read_cost}` |
| `user_commands` | int | Non-interruption user commands |
| `interrupted_commands` | int | Commands followed by interruptions |
| `interruption_rate` | float | Percentage (0-100) |
| `errors` | int | Error count |
| `assistant_messages` | int | Assistant response count |
| `error_rate` | float | Percentage (0-100) |

### 6.5 Hourly Pattern Statistics

| Field | Type | Description |
|-------|------|-------------|
| `messages` | dict | `{hour(0-23): message_count}` |
| `tokens` | dict | `{hour(0-23): {input, output, cache_creation, cache_read}}` |

### 6.6 Error Statistics

| Field | Type | Description |
|-------|------|-------------|
| `total` | int | Total error messages |
| `rate` | float | Error rate (errors/total messages) |
| `by_type` | dict | Count by message type |
| `by_category` | dict | Count by error category (see below) |
| `error_details` | list | `[{timestamp, session_id, model}]` |
| `assistant_details` | list | `[{timestamp, is_error}]` |

**Error Categories** (regex-matched from `sniffly/core/constants.py`):
- User Interruption
- Command Timeout
- File Not Read
- File Modified
- File Too Large
- Content Not Found
- No Changes
- Permission Error
- Tool Not Found
- Wrong Tool
- Code Runtime Error
- Port Binding Error
- Syntax Error
- Notebook Cell Not Found
- Other Tool Errors

### 6.7 Model Statistics

Per-model breakdown:

| Field | Type | Description |
|-------|------|-------------|
| `count` | int | Times model used |
| `input_tokens` | int | Total input tokens |
| `output_tokens` | int | Total output tokens |
| `cache_creation_tokens` | int | Cache creation tokens |
| `cache_read_tokens` | int | Cache read tokens |

### 6.8 User Interaction Statistics

| Field | Type | Description |
|-------|------|-------------|
| `real_user_messages` | int | Non-tool-result user messages |
| `user_commands_analyzed` | int | Non-interruption user commands |
| `commands_requiring_tools` | int | Commands that used tools |
| `commands_without_tools` | int | Commands without tools |
| `percentage_requiring_tools` | float | % (0-100) |
| `total_tools_used` | int | Total tool invocations |
| `total_search_tools` | int | Search tool count (Grep, LS, Glob, Bash+search) |
| `search_tool_percentage` | float | % (0-100) |
| `total_assistant_steps` | int | Total assistant response messages |
| `avg_tools_per_command` | float | Mean tools per command |
| `avg_tools_when_used` | float | Mean tools when tools are actually used |
| `avg_steps_per_command` | float | Mean assistant steps per command |
| `avg_tokens_per_command` | float | Mean estimated tokens per command |
| `percentage_steps_with_tools` | float | % steps involving tool use |
| `tool_count_distribution` | dict | `{tool_count: frequency}` |
| `interruption_rate` | float | % (0-100) |
| `non_interruption_commands` | int | Commands not interrupted |
| `commands_followed_by_interruption` | int | Interrupted commands |
| `tool_interruption_rates` | dict | Per tool count: `{rate, total_commands, interrupted_commands}` |
| `model_distribution` | dict | `{model_name: command_count}` |

**Command Details** (per-command array):

| Field | Type | Description |
|-------|------|-------------|
| `user_message` | str | Full user message text |
| `user_message_truncated` | str | Truncated to 100 chars |
| `timestamp` | str | ISO timestamp |
| `session_id` | str | Session ID |
| `tools_used` | int | Tool count (reconciled) |
| `tool_names` | list | Tool names used |
| `has_tools` | bool | Whether tools were used |
| `assistant_steps` | int | Assistant response count |
| `model` | str | Model used |
| `is_interruption` | bool | Is interruption message |
| `followed_by_interruption` | bool | Next command was interruption |
| `estimated_tokens` | float | Token estimate for command |
| `search_tools_used` | int | Search tool count |

### 6.9 Cache Statistics

| Field | Type | Description |
|-------|------|-------------|
| `total_created` | int | Total cache creation tokens |
| `total_read` | int | Total cache read tokens |
| `messages_with_cache_read` | int | Messages reading from cache |
| `messages_with_cache_created` | int | Messages creating cache |
| `assistant_messages` | int | Total assistant messages |
| `hit_rate` | float | Cache hit rate % |
| `efficiency` | float | Cache efficiency % (capped at 100) |
| `tokens_saved` | int | Net tokens saved (read - creation) |
| `cost_saved_base_units` | float | Cost savings in base token units |
| `break_even_achieved` | bool | cache_read > cache_creation |
| `cache_roi` | float | ROI % |

**Code reference:** `sniffly/core/stats.py`

---

## 7. Pricing & Cost Calculation

### Token Cost Model

Each Claude model has 4 pricing dimensions (per million tokens):

| Model | Input | Output | Cache Creation | Cache Read |
|-------|-------|--------|---------------|------------|
| claude-opus-4-20250514 | $15 | $75 | $18.75 | $1.50 |
| claude-3-5-sonnet-20241022 | $3 | $15 | $3.75 | $0.30 |
| claude-3-5-haiku-20241022 | $1 | $5 | $1.25 | $0.10 |
| claude-3-opus-20240229 | $15 | $75 | $18.75 | $1.50 |
| claude-3-sonnet-20240229 | $3 | $15 | $3.75 | $0.30 |
| claude-3-haiku-20240307 | $0.25 | $1.25 | $0.30 | $0.03 |

### Cost Formula

```
total_cost = (input_tokens x input_cost_per_token)
           + (output_tokens x output_cost_per_token)
           + (cache_creation_tokens x cache_creation_cost_per_token)
           + (cache_read_tokens x cache_read_cost_per_token)
```

### Pricing Sources (Priority Order)

1. **Dynamic pricing** via LiteLLM (fetched from GitHub, cached 24h at `~/.sniffly/cache/pricing.json`)
2. **Hardcoded defaults** for 6 core models
3. **Fallback** to `claude-3-5-sonnet-20241022` pricing for unknown models

### Cache Cost Multipliers

- Cache creation = input_cost x 1.25
- Cache read = input_cost x 0.10

**Code reference:** `sniffly/utils/pricing.py`, `sniffly/services/pricing_service.py`

---

## 8. Global Cross-Project Aggregation

The `GlobalStatsAggregator` merges statistics across all projects.

### Output Structure

```python
{
    "total_projects": int,
    "first_use_date": "ISO timestamp" | None,
    "last_use_date": "ISO timestamp" | None,
    "total_input_tokens": int,
    "total_output_tokens": int,
    "total_cache_read_tokens": int,
    "total_cache_write_tokens": int,
    "total_commands": int,
    "total_cost": float,
    "daily_token_usage": [
        {"date": "YYYY-MM-DD", "input": int, "output": int}
        # ... (30 items, last 30 days)
    ],
    "daily_costs": [
        {
            "date": "YYYY-MM-DD",
            "cost": float,
            "input_cost": float,
            "output_cost": float,
            "cache_cost": float
        }
        # ... (30 items, last 30 days)
    ]
}
```

### Aggregation Process

1. Iterates all project stats from cache
2. Sums all-time tokens: input, output, cache_read, cache_creation
3. Sums `user_commands_analyzed` across projects
4. Sums `total_cost` across projects
5. For last 30 days: aggregates daily tokens and costs per day per model
6. Tracks earliest `first_message_date` and latest `last_message_date`

**Code reference:** `sniffly/core/global_aggregator.py`

---

## 9. Caching Architecture

### Two-Tier Cache

| Tier | Type | Storage | Key | Max |
|------|------|---------|-----|-----|
| **L1** | In-Memory LRU | Python dict | `project_path` | 5 projects, 500MB each |
| **L2** | Disk JSON | `~/.sniffly/cache/[md5_hash]/` | MD5 of `log_path` | Unlimited |

### L1 Memory Cache (`MemoryCache`)

- **Stored data:** `(messages, stats, timestamp, last_accessed)` tuple
- **Eviction:** LRU with 5-minute access protection window
- **Size estimation:** JSON serialization x 1.5 overhead factor
- **Methods:** `get()`, `put()`, `invalidate()`, `get_stats()`

### L2 Disk Cache (`LocalCacheService`)

- **Files per project:**
  - `messages.json` - Full message list
  - `stats.json` - Statistics dict
  - `metadata.json` - File checksums and cache timestamps
- **Change detection:** Compares file size + mtime (< 5ms for 10-50 files)
- **Methods:** `get_cached_stats()`, `get_cached_messages()`, `has_changes()`, `save_cached_*`

### Cache Warming

On startup, `warm_recent_projects()` pre-loads the N most recently modified projects:
1. Sort projects by JSONL modification time (most recent first)
2. Process top N projects (default from config: 3)
3. Save to both L2 and L1 cache
4. 100ms delay between projects

### Cache Flow

```
Request → L1 hit? → Return
        → L2 hit + no changes? → Load to L1, return
        → Full reprocess → Save to L2 + L1, return
```

**Code reference:** `sniffly/utils/memory_cache.py`, `sniffly/utils/local_cache.py`, `sniffly/utils/cache_warmer.py`

---

## 10. API Endpoints

### Server: FastAPI + Uvicorn

Default: `http://127.0.0.1:8081`

CORS: All origins allowed (`*`)

### Complete Endpoint List

#### Page Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Overview page (serves `overview.html`) |
| GET | `/dashboard.html` | Dashboard page |
| GET | `/project/{project_name:path}` | Project-specific dashboard |

#### Project Management

| Method | Route | Parameters | Response |
|--------|-------|-----------|----------|
| POST | `/api/project` | Body: `{project_path}` | Sets current project |
| GET | `/api/project` | - | Current project info |
| POST | `/api/project-by-dir` | Body: `{dir_name}` | Sets project by directory name |
| GET | `/api/recent-projects` | - | 20 most recent projects |
| GET | `/api/projects` | `?include_stats=bool&sort_by=str&limit=int&offset=int` | All projects with optional stats |

#### Data Endpoints

| Method | Route | Parameters | Response Shape |
|--------|-------|-----------|---------------|
| GET | `/api/stats` | `?timezone_offset=int` | Full statistics object |
| GET | `/api/dashboard-data` | `?timezone_offset=int` | `{statistics, messages_page, message_count, config}` |
| GET | `/api/messages` | `?limit=int&timezone_offset=int` | Message array |
| GET | `/api/messages/summary` | - | `{total, by_type, by_model, total_tokens}` |
| GET | `/api/global-stats` | - | Global aggregated statistics |

#### Cache & Refresh

| Method | Route | Parameters | Response |
|--------|-------|-----------|----------|
| POST | `/api/refresh` | Body: `{timezone_offset}` | `{status, files_changed, refresh_time_ms}` |
| GET | `/api/cache/status` | - | Cache hit/miss statistics |

#### File Inspection

| Method | Route | Parameters | Response |
|--------|-------|-----------|----------|
| GET | `/api/jsonl-files` | `?project=str` | File list with metadata |
| GET | `/api/jsonl-content` | `?file=str&project=str` | Raw JSONL content |

#### Pricing

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/pricing` | Current model pricing |
| POST | `/api/pricing/refresh` | Force refresh pricing data |

#### Sharing

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/share-enabled` | Check if sharing is enabled |
| POST | `/api/share` | Create shareable link |

#### Health

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/favicon.ico` | Favicon (204 if not found) |

### Key Response: `/api/dashboard-data`

```json
{
  "statistics": {
    "overview": {
      "project_name": "myapp",
      "total_messages": 1234,
      "total_tokens": {"input": 500000, "output": 100000, "cache_read": 300000, "cache_creation": 50000},
      "total_cost": 2.45,
      "date_range": {"start": "2024-01-01T00:00:00Z", "end": "2024-03-28T23:59:59Z"},
      "sessions": 42,
      "message_types": {"user": 500, "assistant": 480, "task": 20, "summary": 10}
    },
    "tools": {"usage_counts": {"Read": 150, "Bash": 120, "Edit": 80, "Write": 40}},
    "sessions": {"count": 42, "average_duration_seconds": 1800},
    "daily_stats": {"2024-03-28": {"messages": 50, "tokens": {...}, "cost": {...}}},
    "hourly_pattern": {"messages": {"0": 5, "1": 2, ...}, "tokens": {...}},
    "errors": {"total": 15, "rate": 0.03, "by_category": {...}},
    "models": {"claude-3-5-sonnet-20241022": {"count": 400, "input_tokens": 400000}},
    "user_interactions": {"user_commands_analyzed": 200, "interruption_rate": 5.0, ...},
    "cache": {"hit_rate": 85.0, "efficiency": 92.0}
  },
  "messages_page": {
    "messages": [...],
    "total": 1234,
    "page": 1,
    "per_page": 50,
    "total_pages": 25
  },
  "message_count": 1234,
  "config": {
    "messages_initial_load": 500,
    "enable_memory_monitor": false,
    "max_date_range_days": 30
  }
}
```

### Key Response: `/api/projects?include_stats=true`

```json
{
  "projects": [
    {
      "dir_name": "-Users-john-dev-myapp",
      "log_path": "/Users/john/.claude/projects/-Users-john-dev-myapp",
      "display_name": "-Users-john-dev-myapp",
      "last_modified": 1711670400.0,
      "first_seen": 1704067200.0,
      "in_cache": true,
      "url_slug": "-Users-john-dev-myapp",
      "stats": {
        "total_input_tokens": 500000,
        "total_output_tokens": 100000,
        "total_cache_read": 300000,
        "total_cache_write": 50000,
        "total_commands": 200,
        "avg_tokens_per_command": 3000.0,
        "avg_steps_per_command": 4.5,
        "compact_summary_count": 3,
        "first_message_date": "2024-01-01T00:00:00Z",
        "last_message_date": "2024-03-28T23:59:59Z",
        "total_cost": 2.45
      }
    }
  ]
}
```

**Code reference:** `sniffly/server.py`, `sniffly/api/data.py`, `sniffly/api/messages.py`, `sniffly/api/data_loader.py`

---

## 11. Frontend Features

### Pages

| Page | Template | URL | Purpose |
|------|----------|-----|---------|
| Overview | `overview.html` | `/` | All projects list + global charts |
| Dashboard | `dashboard.html` | `/project/{name}` | Single project analytics |

### External Libraries

| Library | Version | CDN | Purpose |
|---------|---------|-----|---------|
| Chart.js | latest | `cdn.jsdelivr.net/npm/chart.js` | All chart rendering |
| jsPDF | 2.5.1 | cdnjs | PDF export |
| JSZip | 3.10.1 | cdnjs | ZIP export |
| html2canvas | 1.4.1 | cdnjs | Screenshot capture |

### JS Module Loading Order (Dashboard)

1. `constants.js` - Constants and config
2. `utils.js` - Utility functions
3. `pricing.js` - Pricing calculations
4. `stats.js` - Statistics calculations
5. `stats-cards.js` - Stat card rendering
6. `dynamic-interval-chart-builder.js` - Chart builder
7. `date-range-picker.js` - Date range pickers
8. `charts.js` - Chart initialization
9. `export.js` - Export (PDF/ZIP)
10. `jsonl-viewer.js` - JSONL file viewer
11. `message-modal.js` - Message detail modal
12. `commands-tab.js` - Commands tab
13. `messages-tab.js` - Messages tab
14. `memory-monitor.js` - Browser memory monitoring
15. `project-detector.js` - URL-based project detection

---

## 12. Dashboard Charts (12 Total)

### Static Charts

| # | Chart | Type | Canvas ID | Data Source | Description |
|---|-------|------|-----------|-------------|-------------|
| 1 | Tool Usage | Bar (horizontal) | `tools-chart` | `statistics.tools.usage_counts` | Top 10 tools by usage count |
| 2 | Hourly Tokens | Bar (stacked) | `hourly-tokens-chart` | `statistics.hourly_pattern.tokens` | Input/output tokens by hour (0-23) |
| 3 | User Command Analysis | Bar | `user-interactions-chart` | `statistics.user_interactions.tool_count_distribution` | % of commands using N tools |
| 4 | Model Usage | Pie | `model-usage-chart` | `statistics.user_interactions.model_distribution` | Token usage distribution by model |
| 5 | Error Distribution | Doughnut | `error-distribution-chart` | `statistics.errors.by_category` | Error count by category |
| 6 | Token Usage Over Time | Bar (stacked) | `tokens-chart` | `statistics.daily_stats` | Daily input/output tokens (last 30 days) |
| 7 | Daily Cost Breakdown | Bar (stacked) | `daily-cost-chart` | `statistics.daily_stats.cost` | Daily input/output/cache cost (last 30 days) |

### Dynamic Interval Charts (Line)

| # | Chart | Canvas ID | Data Source | Datasets |
|---|-------|-----------|-------------|----------|
| 8 | Command Complexity | `command-complexity-chart` | `command_details` | Avg tools/cmd (blue), Avg steps/cmd (amber) |
| 9 | Command Length | `command-length-chart` | `command_details` | Avg tokens/cmd (blue) |
| 10 | Tool Usage Trends | `tool-trends-chart` | `command_details` | One line per tool (top 10 tools) |
| 11 | Interruption Rate | `interruption-rate-trend-chart` | `command_details` | Rate % (red), Commands count (blue), Interrupted count (orange) |
| 12 | Error Rate | `error-rate-trend-chart` | `errors.assistant_details` | Rate % (red), Error count (orange), Assistant msgs (blue) |

### Dynamic Interval Logic

- < 10 days of data: 4-hour buckets
- >= 10 days: daily buckets
- Limited to last 60 data points
- Lines with tension: 0.3 (smooth curves)

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Blue | `#667eea` | Primary (input tokens, tools, commands) |
| Purple | `#764ba2` | Secondary (output tokens) |
| Green | `#48bb78` | Cache operations |
| Red | `#ef4444` | Errors, interruptions |
| Orange | `#f59e0b` | Warnings, secondary metrics |
| Amber | `#ed8936` | Steps per command |

### Overview Page Charts (2)

| Chart | Type | Data Source |
|-------|------|-------------|
| Token Usage | Bar (stacked) | `global_stats.daily_token_usage` (30 days) |
| Direct API Cost | Bar (stacked) | `global_stats.daily_costs` (30 days) |

**Code reference:** `sniffly/static/js/charts.js`, `sniffly/static/js/dynamic-interval-chart-builder.js`

---

## 13. Dashboard Stat Cards (6 Total)

| # | Card | Main Value | Data Field | Breakdown Details |
|---|------|-----------|------------|-------------------|
| 1 | User Commands | Count | `user_interactions.user_commands_analyzed` | Avg tokens/cmd, books equivalent, days inclusive |
| 2 | User Interruption Rate | % | `user_interactions.interruption_rate` | X of Y commands (numerator/denominator) |
| 3 | Steps per Command | Average | `user_interactions.avg_steps_per_command` | Avg tools/cmd, longest chain |
| 4 | Tool Use Rate | % | `user_interactions.percentage_requiring_tools` | Distinct tools count, total tool calls, search tool % |
| 5 | Project Cost | USD | `overview.total_cost` | Total tokens, input tokens, output tokens |
| 6 | Prompt Cache Read | Token count | `overview.total_tokens.cache_read` | Total messages, cache creation tokens, cache hit rate |

### Derived Calculations

- **Books equivalent:** `(commands x avg_tokens x 3/4) / 60,000` (assumes 60k words per book)
- **Commands per context:** Derived from `compact_summary` count
- **Cache cost saved:** `(read x 0.9) - (created x 0.25)` in base token units

**Code reference:** `sniffly/static/js/stats-cards.js`, `sniffly/static/js/stats.js`

---

## 14. Data Tables & Tabs

### Tab 1: User Commands

**Data source:** `statistics.user_interactions.command_details`

| Column | Field | Description |
|--------|-------|-------------|
| User Command | `user_message` | Full command text |
| Timestamp | `timestamp` | Formatted date/time |
| Model | `model` | Claude model name |
| Steps | `assistant_steps` | Assistant response steps |
| Tools | `tools_used` | Tool call count |
| Tokens | `estimated_tokens` | Estimated token count |
| Interrupted | `followed_by_interruption` | Boolean flag |
| Tool Names | `tool_names` | List of tools used (with occurrence counts) |

**Features:** Search by message text, filter by interruption status, sortable columns, pagination, detail modal with full tool list

### Tab 2: Messages

**Data source:** All processed messages

| Column | Field | Description |
|--------|-------|-------------|
| Type | `type` | Message type badge |
| Message | `content` | Truncated content with error indicator |
| Timestamp | `timestamp` | Formatted date/time |
| Model | `model` | Model name or "-" |
| Tokens | `tokens.input + tokens.output` | Combined token count |
| Tools | `tools` | Tool name chips |

**Features:** Filter by type/error/tool, text search, sortable, pagination, message detail modal with full metadata

**Message Modal shows:** Type, timestamp, session ID (copy), message ID (copy), model, all 4 token counts, working directory, error indicator, full content, detailed tool list with inputs, previous/next navigation

### Tab 3: JSONL Viewer

**Data source:** Raw JSONL files via `/api/jsonl-content`

| Column | Field | Description |
|--------|-------|-------------|
| Line | index | Line number |
| Type | `type` | Entry type badge |
| Timestamp | `timestamp` | Formatted date/time |
| Content | content preview | Truncated content |
| UUID | `uuid` | First 8 characters |

**Features:** File selector dropdown with metadata (date, size), filter by type, text search, sortable, detail modal with pretty-printed JSON

### Overview Projects Table

| Column | Data Source |
|--------|-----------|
| Project | `display_name` |
| Last Active | `last_modified` |
| Duration | Computed from `first_message_date` to `last_message_date` |
| Cost | `stats.total_cost` |
| Commands | `stats.total_commands` |
| Tokens/Cmd | `stats.avg_tokens_per_command` |
| Steps/Cmd | `stats.avg_steps_per_command` |
| Cmds/Context | Computed from `compact_summary_count` |
| Books | Computed: `(total_words / 60,000)` |
| Status | `in_cache` (green/gray indicator) |

**Features:** Search by name, sortable all columns, pagination, clickable rows navigate to project dashboard, background stat refresh every 2s (stops after 60s)

**Code reference:** `sniffly/static/js/commands-tab.js`, `sniffly/static/js/messages-tab.js`, `sniffly/static/js/jsonl-viewer.js`, `sniffly/static/js/overview.js`

---

## 15. Export & Sharing

### Export (ZIP)

**Triggered by:** `exportDashboard()` function

**ZIP contents:**
- `analytics_report.pdf` - Generated PDF report
- `overview_statistics.png` - Stats cards screenshot
- `charts/` folder with 12 PNG chart images

**PDF Report includes:**
- Title: "Claude Code Analytics Report" + project name + date
- Summary Statistics: total commands, sessions, duration, messages, interruption rate, tool usage rate, avg steps/cmd, avg tools/cmd, all 4 token counts, cache hit rate, efficiency
- Tool Usage Analysis: Top 15 tools by usage
- Charts Reference: Filenames with descriptions

**Filename format:** `{logDirName}_{date}_{time}.zip`

### Sharing

**Module:** `ShareManager` in `sniffly/share.py`

**Share Data (JSON):**
```python
{
    "id": "24-char UUID",
    "created_at": "ISO timestamp",
    "version": "package version",
    "is_public": bool,
    "title": str | None,
    "description": str | None,
    "project_name": str,
    "statistics": {
        "overview": {...},     # Sanitized (file paths removed)
        "tools": {...},
        "user_interactions": {...}
    },
    "charts": [...],           # Chart config objects
    "user_commands": [...]     # Optional, if include_commands=True
}
```

**Upload Backends:**
1. Local dev: JSON file writes to local folder
2. Production with R2: Cloudflare R2 via boto3/S3 API
3. Production (PyPI users): HTTP POST to `https://sniffly.dev` API

**Sanitization:** Full file paths removed; only `log_dir_name` kept

**Code reference:** `sniffly/static/js/export.js`, `sniffly/share.py`

---

## 16. Configuration

### Config File: `~/.sniffly/config.json`

| Key | Env Var | Default | Type | Description |
|-----|---------|---------|------|-------------|
| `port` | `PORT` | 8081 | int | Server port |
| `host` | `HOST` | 127.0.0.1 | str | Server host |
| `cache_max_projects` | `CACHE_MAX_PROJECTS` | 5 | int | Max projects in memory cache |
| `cache_max_mb_per_project` | `CACHE_MAX_MB_PER_PROJECT` | 500 | int | Max MB per project |
| `auto_browser` | `AUTO_BROWSER` | true | bool | Auto-open browser |
| `max_date_range_days` | `MAX_DATE_RANGE_DAYS` | 30 | int | Max date range for queries |
| `messages_initial_load` | `MESSAGES_INITIAL_LOAD` | 500 | int | Initial messages to load |
| `enable_memory_monitor` | `ENABLE_MEMORY_MONITOR` | false | bool | Enable JS memory monitoring |
| `enable_background_processing` | `ENABLE_BACKGROUND_PROCESSING` | true | bool | Auto-process projects |
| `cache_warm_on_startup` | `CACHE_WARM_ON_STARTUP` | 3 | int | Projects to pre-warm |
| `log_level` | `LOG_LEVEL` | INFO | str | Logging level |
| `share_base_url` | `SHARE_BASE_URL` | https://sniffly.dev | str | Share base URL |
| `share_api_url` | `SHARE_API_URL` | https://sniffly.dev | str | Share API URL |
| `share_enabled` | `SHARE_ENABLED` | true | bool | Enable sharing |

### Priority Order

1. CLI arguments (highest)
2. Environment variables
3. Config file (`~/.sniffly/config.json`)
4. Hardcoded defaults (lowest)

**Code reference:** `sniffly/config.py`

---

## 17. CLI Interface

### Framework: Click

### Commands

```
sniffly init [--port N] [--host H] [--no-browser] [--clear-cache]
sniffly version
sniffly help
sniffly clear-cache [project]
sniffly config show [--json]
sniffly config set <key> <value>
sniffly config unset <key>
```

### Startup Flow (`sniffly init`)

1. Clear cache if `--clear-cache`
2. First-run setup (welcome message, create `~/.sniffly/config.json`)
3. Load config (CLI args > env vars > config file > defaults)
4. Setup event loop (`uvloop` on macOS/Linux, `winloop` on Windows)
5. Start Uvicorn in daemon thread
6. Open browser (unless `--no-browser`)
7. Enter keep-alive loop (Ctrl+C to exit)

**Code reference:** `sniffly/cli.py`

---

## Appendix: Error Pattern Constants

Defined in `sniffly/core/constants.py`:

| Constant | Value |
|----------|-------|
| `USER_INTERRUPTION_PREFIX` | `"[Request interrupted by user for tool use]"` |
| `USER_INTERRUPTION_API_ERROR` | `"API Error: Request was aborted."` |

**`ERROR_PATTERNS` dictionary** - 14 categories with regex patterns:
- User Interruption, Command Timeout, File Not Read, File Modified, File Too Large, Content Not Found, No Changes, Permission Error, Tool Not Found, Wrong Tool, Code Runtime Error, Port Binding Error, Syntax Error, Notebook Cell Not Found, Other Tool Errors

---

## Appendix: Key File Reference

| File | Purpose |
|------|---------|
| `sniffly/core/processor.py` | 13-phase JSONL processing pipeline |
| `sniffly/core/stats.py` | Statistics generation (9 sections) |
| `sniffly/core/global_aggregator.py` | Cross-project aggregation |
| `sniffly/core/constants.py` | Error patterns, interruption constants |
| `sniffly/utils/log_finder.py` | Claude Code log discovery |
| `sniffly/utils/pricing.py` | Pricing data and cost calculation |
| `sniffly/utils/memory_cache.py` | L1 in-memory LRU cache |
| `sniffly/utils/local_cache.py` | L2 disk JSON cache |
| `sniffly/utils/cache_warmer.py` | Startup cache warming |
| `sniffly/server.py` | FastAPI server with all routes |
| `sniffly/api/data.py` | Response formatting utilities |
| `sniffly/api/messages.py` | Pagination and summary helpers |
| `sniffly/api/data_loader.py` | Cache-aware data loading orchestrator |
| `sniffly/config.py` | Configuration management |
| `sniffly/cli.py` | Click CLI interface |
| `sniffly/share.py` | Share/export to R2/API |
| `sniffly/services/pricing_service.py` | Dynamic pricing from LiteLLM |
| `sniffly/static/js/charts.js` | 12 Chart.js visualizations |
| `sniffly/static/js/stats-cards.js` | 6 stat card renderers |
| `sniffly/static/js/commands-tab.js` | Commands table with filtering |
| `sniffly/static/js/messages-tab.js` | Messages table with filtering |
| `sniffly/static/js/overview.js` | Overview page: projects table + global charts |
| `sniffly/static/js/export.js` | PDF/ZIP export |
| `sniffly/static/js/jsonl-viewer.js` | Raw JSONL file browser |
| `sniffly/static/js/pricing.js` | Frontend pricing calculations |
| `sniffly/static/js/memory-monitor.js` | Browser heap memory tracking |
| `sniffly/static/js/dynamic-interval-chart-builder.js` | Line chart factory |
| `sniffly/static/js/date-range-picker.js` | Date range picker component |
| `sniffly/static/js/project-detector.js` | URL-based project detection |
| `sniffly/static/js/message-modal.js` | Message detail modal |
| `sniffly/templates/dashboard.html` | Dashboard page (12 charts + 3 tabs) |
| `sniffly/templates/overview.html` | Overview page (projects + 2 charts) |
