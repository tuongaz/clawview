"""Pydantic data models for ClawHawk session data."""

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
    stop_reason: str = ""
    model: str = ""
    usage: MessageUsage = MessageUsage()


class Message(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    type: str = ""
    session_id: str = ""
    cwd: str = ""
    git_branch: str = ""
    timestamp: str = ""
    message: MessageContent = MessageContent()
    version: str = ""
