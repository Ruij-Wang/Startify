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
        version="0.1.0",
        api_prefix="/api",
        database_url=database_url,
        db_path=db_path,
    )
