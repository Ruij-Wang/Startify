from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from .config import Settings, get_settings
from .database import init_database, make_engine, make_session_factory
from .routers.ai import router as ai_router
from .routers.health import router as health_router
from .routers.recommendations import router as recommendations_router
from .routers.sessions import router as sessions_router
from .routers.tasks import router as tasks_router
from .services.seed import seed_tasks


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    workspace_root = Path(__file__).resolve().parents[2]
    index_path = workspace_root / "index.html"
    frontend_dir = workspace_root / "frontend"

    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        active_engine = engine
        active_session_factory = session_factory
        database_mode = "sqlite-file"

        try:
            init_database(active_engine)
        except OperationalError:
            fallback_url = "sqlite+pysqlite:///:memory:"
            active_engine = make_engine(fallback_url)
            active_session_factory = make_session_factory(active_engine)
            init_database(active_engine)
            database_mode = "sqlite-memory-fallback"

        app.state.engine = active_engine
        app.state.session_factory = active_session_factory
        app.state.database_mode = database_mode

        with active_session_factory() as db:
            seed_tasks(db)
        yield
        active_engine.dispose()
        if active_engine is not engine:
            engine.dispose()

    app = FastAPI(
        title=settings.project_name,
        version=settings.version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.database_mode = "initializing"

    # 原型阶段允许静态前端直接连接本地接口。
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if frontend_dir.exists():
        app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")

    api_prefix = settings.api_prefix
    app.include_router(health_router, prefix=api_prefix)
    app.include_router(tasks_router, prefix=api_prefix)
    app.include_router(sessions_router, prefix=api_prefix)
    app.include_router(recommendations_router, prefix=api_prefix)
    app.include_router(ai_router, prefix=api_prefix)

    @app.get("/")
    def root():
        if index_path.exists():
            return FileResponse(index_path)
        return JSONResponse(
            {
                "project": settings.project_name,
                "docs": "/docs",
                "health": f"{api_prefix}/health",
            }
        )

    return app


app = create_app()
