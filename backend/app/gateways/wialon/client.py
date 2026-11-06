import json
from typing import Any

import httpx

from app.gateways.wialon.dto import (
    WialonUnit,
    WialonUnitSearchResult,
    unit_from_wialon,
)
from app.gateways.wialon.exceptions import (
    WialonApiError,
    WialonAuthenticationError,
    WialonConnectionError,
)
from app.gateways.wialon.session import WialonSession


class WialonClient:
    """Synchronous Wialon HTTP adapter with an in-memory, refreshed session."""

    # 1: base unit fields; 1024: last message and last known location.
    UNIT_FLAGS = 1025

    def __init__(
        self,
        token: str,
        host: str,
        timeout_seconds: float,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._token = token
        self._url = f"https://{host.strip().rstrip('/')}/wialon/ajax.html"
        self._http = http_client or httpx.Client(timeout=timeout_seconds)
        self._owns_http = http_client is None
        self._session = WialonSession()

    def close(self) -> None:
        if self._owns_http:
            self._http.close()

    def _post(self, service: str, params: dict[str, Any], sid: str | None) -> Any:
        form = {"svc": service, "params": json.dumps(params, separators=(",", ":"))}
        if sid is not None:
            form["sid"] = sid
        try:
            response = self._http.post(self._url, data=form)
            response.raise_for_status()
            body = response.json()
        except httpx.TransportError as exc:
            raise WialonConnectionError(
                "No fue posible conectar con el servicio de telemetría."
            ) from exc
        except (httpx.HTTPStatusError, ValueError) as exc:
            raise WialonConnectionError(
                "El servicio de telemetría devolvió una respuesta inválida."
            ) from exc

        if isinstance(body, dict) and isinstance(body.get("error"), int):
            raise WialonApiError(body["error"])
        return body

    def _login(self) -> str:
        try:
            body = self._post("token/login", {"token": self._token, "fl": 1}, None)
        except WialonApiError as exc:
            raise WialonAuthenticationError(
                "No fue posible autenticar el servicio de telemetría."
            ) from exc
        sid = body.get("eid") if isinstance(body, dict) else None
        if not isinstance(sid, str) or not sid:
            raise WialonAuthenticationError(
                "El servicio de telemetría no entregó una sesión válida."
            )
        return sid

    def _request(self, service: str, params: dict[str, Any]) -> Any:
        return self._session.execute(
            lambda sid: self._post(service, params, sid),
            self._login,
        )

    def search_items(
        self,
        query: str | None,
        offset: int,
        limit: int,
    ) -> WialonUnitSearchResult:
        value_mask = f"*{query}*" if query else "*"
        body = self._request(
            "core/search_items",
            {
                "spec": {
                    "itemsType": "avl_unit",
                    "propName": "sys_name",
                    "propValueMask": value_mask,
                    "sortType": "sys_name",
                },
                "force": 1,
                "flags": self.UNIT_FLAGS,
                "from": offset,
                "to": offset + limit - 1,
            },
        )
        if not isinstance(body, dict) or not isinstance(body.get("items"), list):
            raise WialonConnectionError(
                "El servicio de telemetría devolvió unidades en un formato inválido."
            )
        items = [
            unit
            for item in body["items"]
            if isinstance(item, dict)
            if (unit := unit_from_wialon(item)) is not None
        ]
        total = body.get("totalItemsCount")
        if isinstance(total, bool) or not isinstance(total, int):
            total = len(items)
        return WialonUnitSearchResult(items=items, total=total)

    def search_item(self, unit_id: int) -> WialonUnit | None:
        """Reserved for detail use; the response is parsed before leaving this adapter."""
        body = self._request(
            "core/search_item", {"id": unit_id, "flags": self.UNIT_FLAGS}
        )
        item = body.get("item") if isinstance(body, dict) else None
        if not isinstance(item, dict):
            raise WialonConnectionError(
                "El servicio de telemetría devolvió una unidad en formato inválido."
            )
        return unit_from_wialon(item)
