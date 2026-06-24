from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


def make_engine(database_url: str):
    connect_args = {}
    engine_kwargs = {"future": True}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        if database_url.endswith(":memory:"):
            engine_kwargs["poolclass"] = StaticPool

    engine = create_engine(database_url, connect_args=connect_args, **engine_kwargs)

    if database_url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def configure_sqlite(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys = ON")
            cursor.execute("PRAGMA journal_mode = MEMORY")
            cursor.execute("PRAGMA temp_store = MEMORY")
            cursor.close()

    return engine


def make_session_factory(engine):
    return sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


def init_database(engine) -> None:
    Base.metadata.create_all(bind=engine)
