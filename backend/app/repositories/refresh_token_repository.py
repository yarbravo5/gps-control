from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.time import get_current_utc_datetime
from app.models import RefreshToken


def create_refresh_token_record(
    database_session: Session,
    *,
    jti: str,
    user_id: int,
    expires_at: datetime,
) -> RefreshToken:
    refresh_token = RefreshToken(
        jti=jti,
        user_id=user_id,
        expires_at=expires_at,
    )
    database_session.add(refresh_token)
    database_session.flush()
    return refresh_token


def get_refresh_token_by_jti(
    database_session: Session,
    jti: str,
) -> RefreshToken | None:
    return database_session.scalar(
        select(RefreshToken).where(RefreshToken.jti == jti)
    )


def revoke_refresh_token(
    database_session: Session,
    refresh_token: RefreshToken,
) -> None:
    refresh_token.revoked_at = get_current_utc_datetime()
    database_session.flush()


def revoke_all_refresh_tokens_for_user(
    database_session: Session,
    user_id: int,
) -> None:
    database_session.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=get_current_utc_datetime())
    )
