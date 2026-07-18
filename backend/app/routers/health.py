from __future__ import annotations

from fastapi import APIRouter, Request

from ..schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check(request: Request) -> HealthResponse:
    settings = request.app.state.settings
    return HealthResponse(
        project_name=settings.project_name,
        version=settings.version,
        database_ready=True,
        database_mode=request.app.state.database_mode,
        ai_mode="api" if settings.llm_configured else "mock",
    )
