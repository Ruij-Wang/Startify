from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class Settings:
    project_name: str
    version: str
    api_prefix: str
    database_url: str
    db_path: Path
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-v4-flash"
    llm_timeout_seconds: float = 30.0

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_api_key and self.llm_base_url and self.llm_model)


def get_settings() -> Settings:
    backend_root = Path(__file__).resolve().parents[1]
    data_dir = backend_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    db_path = data_dir / "startify.db"
    database_url = os.getenv(
        "STARTIFY_DATABASE_URL",
        f"sqlite:///{db_path.as_posix()}",
    )

    return Settings(
        project_name="Startify Backend",
        version="0.2.0",
        api_prefix="/api",
        database_url=database_url,
        db_path=db_path,
        llm_api_key=os.getenv("STARTIFY_LLM_API_KEY"),
        llm_base_url=os.getenv(
            "STARTIFY_LLM_BASE_URL",
            "https://api.deepseek.com",
        ).rstrip("/"),
        llm_model=os.getenv("STARTIFY_LLM_MODEL", "deepseek-v4-flash"),
        llm_timeout_seconds=float(os.getenv("STARTIFY_LLM_TIMEOUT_SECONDS", "30")),
    )
