from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog


def create_audit_log(
    database_session: Session,
    *,
    user_id: int | None,
    action: str,
    entity: str | None = None,
    entity_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    database_session.add(audit_log)
    database_session.flush()
    return audit_log


def list_audit_logs(
    database_session: Session,
    offset: int = 0,
    limit: int = 100,
) -> list[AuditLog]:
    return list(
        database_session.scalars(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .offset(offset)
            .limit(limit)
        )
    )
