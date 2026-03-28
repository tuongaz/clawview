"""Pydantic data models for ClawLens session data."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


# ---------------------------------------------------------------------------
# Public models (serialized to frontend as camelCase JSON)
# ---------------------------------------------------------------------------


class Session(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    session_id: str = ""
    name: str = ""
    project_name: str = ""
    cwd: str = ""
    git_branch: str = ""
    timestamp: str = ""
    first_prompt: str = ""
    last_user_prompt: str = ""
    last_action: str = ""
    is_active: bool = False
    waiting_for_input: bool = False
    uses_memory: bool = False
    version: str = ""
    context_tokens: int = 0
    max_context_tokens: int = 0
    model: str = ""
    client: str = ""


class TurnEvent(BaseModel):
    """A single event in a turn, either assistant text or a tool call."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    kind: str = ""  # "text" or "tool"
    text: str = ""  # for kind=="text": the assistant text
    tool_name: str = ""  # for kind=="tool": tool name
    tool_detail: str = ""  # for kind=="tool": tool detail


class TurnUsage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0


class Turn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    index: int = 0
    timestamp: str = ""
    user_prompt: str = ""
    events: list[TurnEvent] = []
    usage: TurnUsage = TurnUsage()
    duration_ms: int = 0
    model: str = ""
    stop_reason: str = ""


class SessionDetail(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # All Session fields
    session_id: str = ""
    name: str = ""
    project_name: str = ""
    cwd: str = ""
    git_branch: str = ""
    timestamp: str = ""
    first_prompt: str = ""
    last_user_prompt: str = ""
    last_action: str = ""
    is_active: bool = False
    waiting_for_input: bool = False
    uses_memory: bool = False
    version: str = ""
    context_tokens: int = 0
    max_context_tokens: int = 0
    model: str = ""
    client: str = ""

    # Detail-specific fields
    tool_usage: dict[str, int] = {}
    mcp_tool_usage: dict[str, int] = {}
    skills_used: list[str] = []
    subagents_used: list[str] = []
    commands_used: list[str] = []
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cache_creation_tokens: int = 0
    total_cache_read_tokens: int = 0
    total_duration_ms: int = 0
    turn_count: int = 0
    turns: list[Turn] = []


class ProjectGroup(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    project_name: str = ""
    path: str = ""
    sessions: list[Session] = []


class TokenPeriod(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    input_tokens: int = 0
    output_tokens: int = 0


class TokenStats(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    today: TokenPeriod = TokenPeriod()
    this_week: TokenPeriod = TokenPeriod()
    this_month: TokenPeriod = TokenPeriod()


class MemoryFile(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str = ""
    content: str = ""


class DashboardMessage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    groups: list[ProjectGroup] = []
    stats: TokenStats = TokenStats()


# ---------------------------------------------------------------------------
# Internal models (for parsing JSONL lines)
# ---------------------------------------------------------------------------


class MessageUsage(BaseModel):
    input_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    output_tokens: int = 0


class MessageContent(BaseModel):
    role: str = ""
    content: Any = None
    stop_reason: str | None = ""
    model: str = ""
    usage: MessageUsage = MessageUsage()


class Message(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    type: str = ""
    subtype: str = ""
    content: Any = None
    agent_name: str = ""
    session_id: str = ""
    cwd: str = ""
    git_branch: str = ""
    timestamp: str = ""
    message: MessageContent = MessageContent()
    version: str = ""
