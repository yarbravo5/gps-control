from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.db.session import get_database_session
from app.models import User
from app.schemas.audit import AuditLogResponse
from app.services import audit_service


router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    _current_user: User = Depends(require_permission("audit:view")),
    database_session: Session = Depends(get_database_session),
):
    return audit_service.list_audit_logs(
        database_session,
        offset=offset,
        limit=limit,
    )
