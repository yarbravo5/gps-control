from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog
from app.repositories import audit_repository


def record_audit(
    database_session: Session,
    *,
    user_id: int | None,
    action: str,
    entity: str | None = None,
    entity_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    return audit_repository.create_audit_log(
        database_session,
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )


def record_audit_best_effort(
    database_session: Session,
    *,
    user_id: int | None,
    action: str,
    entity: str | None = None,
    entity_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Persist an audit entry without letting audit failures break the operation."""
    try:
        record_audit(
            database_session,
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
        )
        database_session.commit()
    except Exception:
        database_session.rollback()


def list_audit_logs(
    database_session: Session,
    offset: int = 0,
    limit: int = 100,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> list[AuditLog]:
    return audit_repository.list_audit_logs(
        database_session,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )
