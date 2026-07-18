from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from ..schemas import AIBreakdownRequest, AIBreakdownResponse
from ..services.ai_breakdown import AIProviderError, generate_breakdown

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/breakdown", response_model=AIBreakdownResponse)
async def breakdown_goal(payload: AIBreakdownRequest, request: Request) -> AIBreakdownResponse:
    try:
        return await generate_breakdown(payload.goal, request.app.state.settings)
    except AIProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
