from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Task


DEFAULT_TASKS = [
    {
        "title": "Drink water",
        "category": "health",
        "duration_min": 2,
        "energy_level": 1,
        "favorite": False,
        "source": "system",
        "tags": ["quick", "reset"],
        "recommended_for": ["anxious", "tired", "ten_min"],
    },
    {
        "title": "Read one page",
        "category": "study",
        "duration_min": 5,
        "energy_level": 2,
        "favorite": False,
        "source": "system",
        "tags": ["focus", "clear-step"],
        "recommended_for": ["blank", "ten_min"],
    },
    {
        "title": "Clean your desk",
        "category": "life",
        "duration_min": 5,
        "energy_level": 2,
        "favorite": False,
        "source": "system",
        "tags": ["reset", "clear-step"],
        "recommended_for": ["blank", "anxious"],
    },
    {
        "title": "Write one sentence",
        "category": "work",
        "duration_min": 3,
        "energy_level": 1,
        "favorite": True,
        "source": "system",
        "tags": ["quick", "clear-step"],
        "recommended_for": ["anxious", "blank", "ten_min"],
    },
    {
        "title": "Stretch your body",
        "category": "health",
        "duration_min": 4,
        "energy_level": 1,
        "favorite": False,
        "source": "system",
        "tags": ["reset", "body"],
        "recommended_for": ["tired", "anxious", "ten_min"],
    },
    {
        "title": "Review one concept",
        "category": "study",
        "duration_min": 10,
        "energy_level": 2,
        "favorite": False,
        "source": "system",
        "tags": ["focus"],
        "recommended_for": ["blank", "ten_min"],
    },
]


def seed_tasks(db: Session) -> int:
    existing = db.scalar(select(Task.id).limit(1))
    if existing:
        return 0

    for payload in DEFAULT_TASKS:
        db.add(Task(**payload))

    db.commit()
    return len(DEFAULT_TASKS)
