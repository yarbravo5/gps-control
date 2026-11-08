from datetime import datetime, timedelta

from sqlalchemy import case, delete, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.core.time import ensure_utc
from app.models import LoginRateLimit


def consume_login_rate_limit(
    database_session: Session,
    *,
    key_digest: str,
    now: datetime,
    window_seconds: int,
    retention_seconds: int,
) -> tuple[int, int]:
    """Atomically consume one request from a shared fixed-window bucket."""
    dialect = database_session.get_bind().dialect.name
    if dialect == "postgresql":
        insert = postgresql_insert
    elif dialect == "sqlite":
        insert = sqlite_insert
    else:
        raise RuntimeError(f"Unsupported rate-limit database dialect: {dialect}")

    cutoff = now - timedelta(seconds=window_seconds)
    statement = insert(LoginRateLimit).values(
        key_digest=key_digest,
        window_started_at=now,
        request_count=1,
    )
    statement = statement.on_conflict_do_update(
        index_elements=[LoginRateLimit.key_digest],
        set_={
            "window_started_at": case(
                (LoginRateLimit.window_started_at <= cutoff, now),
                else_=LoginRateLimit.window_started_at,
            ),
            "request_count": case(
                (LoginRateLimit.window_started_at <= cutoff, 1),
                else_=LoginRateLimit.request_count + 1,
            ),
        },
    )
    database_session.execute(statement)

    # Bound storage for random/invalid identities without a background worker.
    database_session.execute(
        delete(LoginRateLimit).where(
            LoginRateLimit.window_started_at < now - timedelta(seconds=retention_seconds)
        )
    )
    row = database_session.scalar(
        select(LoginRateLimit).where(LoginRateLimit.key_digest == key_digest)
    )
    if row is None:
        raise RuntimeError("Login rate-limit bucket was not persisted")

    retry_after = max(
        1,
        int(
            (
                ensure_utc(row.window_started_at)
                + timedelta(seconds=window_seconds)
                - now
            ).total_seconds()
        ),
    )
    database_session.commit()
    return row.request_count, retry_after
