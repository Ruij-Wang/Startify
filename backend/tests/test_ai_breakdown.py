from __future__ import annotations

import asyncio
import unittest
from pathlib import Path
from unittest.mock import patch

from app.config import Settings
from app.services.ai_breakdown import generate_breakdown


class FakeResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self):
        return {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"suggestionTitle":"先列出报告的三个章节",'
                            '"durationMin":8,"energyLevel":1,'
                            '"reason":"先建立可见结构",'
                            '"steps":["打开课程要求","写下三个章节标题"]}'
                        )
                    }
                }
            ]
        }


class FakeAsyncClient:
    last_request = None

    def __init__(self, *args, **kwargs):
        self.request = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return None

    async def post(self, url, **kwargs):
        self.request = (url, kwargs)
        FakeAsyncClient.last_request = self.request
        return FakeResponse()


class AIBreakdownTests(unittest.TestCase):
    def test_configured_provider_returns_api_result(self) -> None:
        settings = Settings(
            project_name="Startify Test",
            version="test",
            api_prefix="/api",
            database_url="sqlite+pysqlite:///:memory:",
            db_path=Path("test.db"),
            llm_api_key="test-key",
            llm_base_url="https://api.deepseek.com",
            llm_model="deepseek-v4-flash",
        )

        with patch("app.services.ai_breakdown.httpx.AsyncClient", FakeAsyncClient):
            result = asyncio.run(generate_breakdown("完成创业管理课程报告", settings))

        self.assertEqual(result.source, "api:deepseek-v4-flash")
        self.assertEqual(result.duration_min, 8)
        self.assertEqual(result.steps[0], "打开课程要求")
        request_url, request_options = FakeAsyncClient.last_request
        self.assertEqual(request_url, "https://api.deepseek.com/chat/completions")
        self.assertEqual(
            request_options["json"]["thinking"],
            {"type": "disabled"},
        )
        self.assertEqual(
            request_options["json"]["response_format"],
            {"type": "json_object"},
        )


if __name__ == "__main__":
    unittest.main()
