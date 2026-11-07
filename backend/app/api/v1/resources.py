from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.vehicles import get_wialon_gateway
from app.core.dependencies import require_permission
from app.gateways.wialon import WialonClient
from app.gateways.wialon.exceptions import WialonIntegrationError
from app.models import User
from app.schemas.people import ResourceListResponse, ResourceSummaryResponse


router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("", response_model=ResourceListResponse)
def list_resources(
    offset: int = Query(default=0, ge=0, le=100_000),
    limit: int = Query(default=100, ge=1, le=100),
    _current_user: User = Depends(require_permission("drivers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> ResourceListResponse:
    try:
        result = gateway.search_resources(offset, limit)
        return ResourceListResponse(
            items=[
                ResourceSummaryResponse(id=resource.id, name=resource.name)
                for resource in result.items
            ],
            total=result.total,
            offset=offset,
            limit=limit,
        )
    except WialonIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible consultar los recursos de personas.",
        ) from exc