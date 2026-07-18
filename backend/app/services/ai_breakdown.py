from __future__ import annotations

import json
import re
from typing import Any

import httpx

from ..config import Settings
from ..schemas import AIBreakdownResponse


class AIProviderError(RuntimeError):
    pass


def build_mock_breakdown(goal: str) -> AIBreakdownResponse:
    compact_goal = goal.strip()
    return AIBreakdownResponse(
        goal=compact_goal,
        suggestion_title=f"先处理：{compact_goal[:18]}",
        duration_min=5,
        energy_level=1,
        reason="当前后端没有配置大模型 API，使用透明标注的规则演示结果。",
        steps=[
            f"把“{compact_goal}”缩成一个 5 分钟内能开始的动作。",
            "先打开相关资料或工作区。",
            "只完成第一步，再决定是否继续。",
        ],
        source="mock",
    )


async def generate_breakdown(goal: str, settings: Settings) -> AIBreakdownResponse:
    compact_goal = goal.strip()
    if not settings.llm_configured:
        return build_mock_breakdown(compact_goal)

    endpoint = f"{settings.llm_base_url}/chat/completions"
    request_payload = {
        "model": settings.llm_model,
        "temperature": 0.2,
        "max_tokens": 400,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是 Startify 的任务启动助手。你的目标是降低启动门槛，"
                    "把模糊目标缩成一个 5 到 10 分钟内能开始的具体动作。"
                    "只返回 JSON，不要输出 Markdown。"
                ),
            },
            {
                "role": "user",
                "content": (
                    "请拆解下面的目标。JSON 字段固定为："
                    '{"suggestionTitle": string, "durationMin": integer, '
                    '"energyLevel": integer, "reason": string, "steps": string[]}。'
                    f"\n目标：{compact_goal}"
                ),
            },
        ],
    }
    if "api.deepseek.com" in settings.llm_base_url:
        request_payload["thinking"] = {"type": "disabled"}
        request_payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(
                endpoint,
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json=request_payload,
            )
            response.raise_for_status()
            provider_payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise AIProviderError("大模型服务暂时不可用，请稍后重试。") from exc

    try:
        content = provider_payload["choices"][0]["message"]["content"]
        parsed = _parse_json_object(content)
        steps = [str(step).strip() for step in parsed["steps"] if str(step).strip()][:5]
        if not steps:
            raise ValueError("steps is empty")
        return AIBreakdownResponse(
            goal=compact_goal,
            suggestion_title=str(parsed["suggestionTitle"]).strip(),
            duration_min=int(parsed["durationMin"]),
            energy_level=int(parsed["energyLevel"]),
            reason=str(parsed["reason"]).strip(),
            steps=steps,
            source=f"api:{settings.llm_model}",
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise AIProviderError("大模型返回格式不符合任务拆解协议。") from exc


def _parse_json_object(content: Any) -> dict[str, Any]:
    if not isinstance(content, str):
        raise ValueError("content is not text")
    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        raise ValueError("JSON object not found")
    payload = json.loads(match.group(0))
    if not isinstance(payload, dict):
        raise ValueError("payload is not an object")
    return payload
