from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Task
from ..schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_task_or_404(db: Session, task_id: str) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(
    category: str | None = None,
    favorite: bool | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[Task]:
    statement = select(Task).where(Task.archived.is_(False)).order_by(
        Task.favorite.desc(),
        Task.updated_at.desc(),
    )
    tasks = list(db.scalars(statement))

    if category:
        tasks = [task for task in tasks if task.category == category]
    if favorite is not None:
        tasks = [task for task in tasks if task.favorite == favorite]
    if search:
        keyword = search.strip().lower()
        tasks = [
            task
            for task in tasks
            if keyword in task.title.lower()
            or any(keyword in tag.lower() for tag in task.tags)
        ]

    return tasks[:limit]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)) -> Task:
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: str, db: Session = Depends(get_db)) -> Task:
    return _get_task_or_404(db, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)) -> Task:
    task = _get_task_or_404(db, task_id)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, db: Session = Depends(get_db)) -> None:
    task = _get_task_or_404(db, task_id)
    task.archived = True
    db.commit()
