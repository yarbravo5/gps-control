from datetime import timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.v1.vehicles import get_wialon_gateway
from app.core.dependencies import require_permission
from app.core.time import get_current_utc_datetime
from app.gateways.wialon import WialonClient
from app.gateways.wialon.exceptions import WialonIntegrationError
from app.models import User
from app.services.csv_service import export_people_csv, export_vehicles_csv


router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/{kind}", response_class=Response)
def export_csv(
    kind: Literal["vehicles", "drivers", "passengers"],
    _current_user: User = Depends(require_permission("export:csv")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> Response:
    try:
        if kind == "vehicles":
            now = get_current_utc_datetime()
            if now.tzinfo is None:
                now = now.replace(tzinfo=timezone.utc)
            content = export_vehicles_csv(gateway, now=now)
        else:
            content = export_people_csv(gateway, kind=kind)
    except WialonIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible obtener los datos para exportar.",
        ) from exc

    return Response(
        content="\ufeff" + content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="gps-control-{kind}.csv"'},
    )