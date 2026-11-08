from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.db.session import get_database_session
from app.models import User
from app.schemas.audit import AuditLogPageResponse
from app.services import audit_service


router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditLogPageResponse)
def list_audit_logs(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    sort_by: Literal["created_at", "action", "entity"] = Query(default="created_at"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    query: str | None = Query(default=None, max_length=100, alias="q"),
    _current_user: User = Depends(require_permission("audit:view")),
    database_session: Session = Depends(get_database_session),
):
    normalized_query = query.strip() if query and query.strip() else None
    items = audit_service.list_audit_logs(
        database_session,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        query=normalized_query,
    )
    return AuditLogPageResponse(
        items=items,
        total=audit_service.count_audit_logs(database_session, normalized_query),
        offset=offset,
        limit=limit,
    )
