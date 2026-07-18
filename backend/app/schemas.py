from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class HealthResponse(APIModel):
    project_name: str
    version: str
    database_ready: bool
    database_mode: str
    ai_mode: Literal["api", "mock"]


class TaskBase(APIModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(default="general", min_length=1, max_length=50)
    duration_min: int = Field(default=5, ge=1, le=180)
    energy_level: int = Field(default=1, ge=1, le=3)
    favorite: bool = False
    source: str = Field(default="user", min_length=1, max_length=30)
    tags: list[str] = Field(default_factory=list)
    recommended_for: list[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    duration_min: int | None = Field(default=None, ge=1, le=180)
    energy_level: int | None = Field(default=None, ge=1, le=3)
    favorite: bool | None = None
    source: str | None = Field(default=None, min_length=1, max_length=30)
    tags: list[str] | None = None
    recommended_for: list[str] | None = None


class TaskRead(TaskBase):
    id: str
    play_count: int
    completed_count: int
    created_at: datetime
    updated_at: datetime


class SessionCreate(APIModel):
    task_id: str
    trigger_state: str | None = Field(default=None, max_length=30)
    note: str | None = Field(default=None, max_length=1000)


class SessionFinish(APIModel):
    status: Literal["completed", "skipped", "abandoned"] = "completed"
    elapsed_sec: int | None = Field(default=None, ge=0, le=24 * 3600)
    note: str | None = Field(default=None, max_length=1000)


class SessionRead(APIModel):
    id: str
    task_id: str
    trigger_state: str | None = None
    status: str
    elapsed_sec: int
    note: str | None = None
    started_at: datetime
    ended_at: datetime | None = None


class RecommendationResponse(APIModel):
    state: str
    tasks: list[TaskRead]
    generated_at: datetime


class AIBreakdownRequest(APIModel):
    goal: str = Field(min_length=1, max_length=200)


class AIBreakdownResponse(APIModel):
    goal: str
    suggestion_title: str = Field(min_length=1, max_length=200)
    duration_min: int = Field(ge=1, le=30)
    energy_level: int = Field(ge=1, le=3)
    reason: str
    steps: list[str] = Field(min_length=1, max_length=5)
    source: str
