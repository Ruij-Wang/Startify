from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Task
from ..schemas import RecommendationResponse
from ..services.recommendations import normalize_state, pick_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=RecommendationResponse)
def get_recommendations(
    state: str | None = None,
    limit: int = Query(default=3, ge=1, le=10),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    tasks = list(db.scalars(select(Task).where(Task.archived.is_(False))))
    normalized_state = normalize_state(state)
    picked = pick_recommendations(tasks, normalized_state, limit)
    return RecommendationResponse(
        state=normalized_state,
        tasks=picked,
        generated_at=datetime.now(timezone.utc),
    )
