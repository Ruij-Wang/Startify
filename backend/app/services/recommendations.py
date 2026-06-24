from __future__ import annotations

from typing import Iterable

from ..models import Task


STATE_ALIASES = {
    "anxious": "anxious",
    "anxiety": "anxious",
    "blank": "blank",
    "empty": "blank",
    "tired": "tired",
    "exhausted": "tired",
    "ten_min": "ten_min",
    "10min": "ten_min",
    "10_min": "ten_min",
    "ten-minute": "ten_min",
    "default": "default",
}


def normalize_state(state: str | None) -> str:
    if not state:
        return "default"
    return STATE_ALIASES.get(state.strip().lower(), "default")


def _matches_state(task: Task, state: str) -> bool:
    if state == "default":
        return True
    if state == "anxious":
        return "anxious" in task.recommended_for or task.duration_min <= 5
    if state == "blank":
        return "blank" in task.recommended_for or "clear-step" in task.tags
    if state == "tired":
        return "tired" in task.recommended_for or task.energy_level == 1
    if state == "ten_min":
        return "ten_min" in task.recommended_for or task.duration_min <= 10
    return True


def _sort_key(task: Task, state: str) -> tuple[int, int, int, int, str]:
    matched = 0 if _matches_state(task, state) else 1
    favorite_rank = 0 if task.favorite else 1
    return (
        matched,
        favorite_rank,
        task.duration_min,
        task.play_count,
        task.title.lower(),
    )


def pick_recommendations(tasks: Iterable[Task], state: str, limit: int) -> list[Task]:
    normalized_state = normalize_state(state)
    available = [task for task in tasks if not task.archived]
    matched = [task for task in available if _matches_state(task, normalized_state)]
    source = matched if matched else available
    return sorted(source, key=lambda task: _sort_key(task, normalized_state))[:limit]
