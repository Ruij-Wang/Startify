from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import SessionRecord, Task
from ..schemas import SessionCreate, SessionFinish, SessionRead

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _get_session_or_404(db: Session, session_id: str) -> SessionRecord:
    item = db.get(SessionRecord, session_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return item


def _get_task_or_404(db: Session, task_id: str) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return task


@router.get("", response_model=list[SessionRead])
def list_sessions(
    task_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[SessionRecord]:
    statement = select(SessionRecord).order_by(SessionRecord.started_at.desc())
    items = list(db.scalars(statement))

    if task_id:
        items = [item for item in items if item.task_id == task_id]
    if status_filter:
        items = [item for item in items if item.status == status_filter]

    return items[:limit]


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def start_session(payload: SessionCreate, db: Session = Depends(get_db)) -> SessionRecord:
    task = _get_task_or_404(db, payload.task_id)
    record = SessionRecord(**payload.model_dump())
    task.play_count += 1
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{session_id}", response_model=SessionRead)
def get_session(session_id: str, db: Session = Depends(get_db)) -> SessionRecord:
    return _get_session_or_404(db, session_id)


@router.patch("/{session_id}/finish", response_model=SessionRead)
def finish_session(session_id: str, payload: SessionFinish, db: Session = Depends(get_db)) -> SessionRecord:
    record = _get_session_or_404(db, session_id)
    if record.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already finished.",
        )

    record.ended_at = datetime.now(timezone.utc)
    record.status = payload.status
    if payload.note is not None:
        record.note = payload.note

    if payload.elapsed_sec is None:
        elapsed = int((record.ended_at - record.started_at).total_seconds())
        record.elapsed_sec = max(elapsed, 0)
    else:
        record.elapsed_sec = payload.elapsed_sec

    if payload.status == "completed":
        task = _get_task_or_404(db, record.task_id)
        task.completed_count += 1

    db.commit()
    db.refresh(record)
    return record
