from __future__ import annotations

from fastapi import APIRouter

from ..schemas import AIBreakdownRequest, AIBreakdownResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/breakdown", response_model=AIBreakdownResponse)
def breakdown_goal(payload: AIBreakdownRequest) -> AIBreakdownResponse:
    goal = payload.goal.strip()
    suggestion_title = f"Open material for {goal}"
    return AIBreakdownResponse(
        goal=goal,
        suggestion_title=suggestion_title,
        duration_min=5,
        energy_level=1,
        reason="当前版本只提供 mock 拆解，用来给前端保留接口位。",
        steps=[
            f"把“{goal}”拆成一个 5 分钟内能开始的动作。",
            "先打开相关资料或工作区。",
            "只完成第一步，不扩展到完整任务列表。",
        ],
        source="mock",
    )
