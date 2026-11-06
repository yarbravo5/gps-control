from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


database_engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

DatabaseSessionFactory = sessionmaker(
    bind=database_engine,
    autoflush=False,
    autocommit=False,
)


class DatabaseBase(DeclarativeBase):
    pass


def get_database_session() -> Generator[Session, None, None]:
    database_session = DatabaseSessionFactory()
    try:
        yield database_session
    finally:
        database_session.close()
