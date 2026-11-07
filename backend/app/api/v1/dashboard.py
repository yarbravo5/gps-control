from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.vehicles import get_wialon_gateway
from app.core.dependencies import require_permission
from app.gateways.wialon import WialonClient
from app.gateways.wialon.exceptions import WialonIntegrationError
from app.models import User
from app.schemas.dashboard import FleetDashboardResponse
from app.services.dashboard_service import get_fleet_dashboard


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=FleetDashboardResponse)
def fleet_dashboard(
    _current_user: User = Depends(require_permission("dashboard:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> FleetDashboardResponse:
    try:
        return FleetDashboardResponse.model_validate(get_fleet_dashboard(gateway))
    except WialonIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible consultar las métricas de la flota.",
        ) from exc