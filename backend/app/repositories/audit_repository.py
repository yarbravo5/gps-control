from typing import Any

from sqlalchemy import asc, desc, func, or_, select
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
    sort_by: str = "created_at",
    sort_order: str = "desc",
    query: str | None = None,
) -> list[AuditLog]:
    sort_columns = {"created_at": AuditLog.created_at, "action": AuditLog.action, "entity": AuditLog.entity}
    ordering = desc(sort_columns[sort_by]) if sort_order == "desc" else asc(sort_columns[sort_by])
    statement = select(AuditLog)
    if query:
        needle = f"%{query.strip().lower()}%"
        statement = statement.where(
            or_(
                func.lower(AuditLog.action).like(needle),
                func.lower(AuditLog.entity).like(needle),
                func.lower(AuditLog.entity_id).like(needle),
            )
        )
    return list(database_session.scalars(
        statement.order_by(ordering, AuditLog.id.desc()).offset(offset).limit(limit)
    ))


def count_audit_logs(database_session: Session, query: str | None = None) -> int:
    statement = select(func.count(AuditLog.id))
    if query:
        needle = f"%{query.strip().lower()}%"
        statement = statement.where(
            or_(
                func.lower(AuditLog.action).like(needle),
                func.lower(AuditLog.entity).like(needle),
                func.lower(AuditLog.entity_id).like(needle),
            )
        )
    return int(database_session.scalar(statement) or 0)
