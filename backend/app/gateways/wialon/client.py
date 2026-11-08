import json
from typing import Any

import httpx

from app.gateways.wialon.dto import (
    WialonBindingEvent,
    WialonDriver,
    WialonHistoryResult,
    WialonPassenger,
    WialonResource,
    WialonResourceSearchResult,
    WialonUnit,
    WialonUnitDriver,
    WialonUnitSearchResult,
    history_from_wialon,
    resource_from_wialon,
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

    # 1: base unit fields; 8: custom fields; 1024: last message and last known location.
    UNIT_FLAGS = 1033
    RESOURCE_BASE_FLAGS = 1
    RESOURCE_DRIVER_FLAGS = RESOURCE_BASE_FLAGS + 256
    RESOURCE_PASSENGER_FLAGS = RESOURCE_BASE_FLAGS + 2_097_152
    RESOURCE_DRIVER_AUTO_FLAGS = RESOURCE_DRIVER_FLAGS + 16_384
    RESOURCE_PASSENGER_AUTO_FLAGS = RESOURCE_PASSENGER_FLAGS + 4_194_304
    RESOURCE_PEOPLE_FLAGS = RESOURCE_DRIVER_FLAGS | RESOURCE_PASSENGER_FLAGS

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
        if item is None:
            return None
        if not isinstance(item, dict):
            raise WialonConnectionError(
                "El servicio de telemetría devolvió una unidad en formato inválido."
            )
        return unit_from_wialon(item)

    def update_unit_custom_field(
        self,
        unit_id: int,
        *,
        field_id: int,
        call_mode: str,
        name: str | None = None,
        value: str | None = None,
    ) -> None:
        params: dict[str, Any] = {
            "itemId": unit_id,
            "id": field_id,
            "callMode": call_mode,
        }
        if call_mode in {"create", "update"}:
            params["n"] = name or ""
            params["v"] = value or ""
        self._request("item/update_custom_field", params)

    def search_resources(self, offset: int, limit: int) -> WialonResourceSearchResult:
        body = self._request(
            "core/search_items",
            {
                "spec": {
                    "itemsType": "avl_resource",
                    "propName": "sys_name",
                    "propValueMask": "*",
                    "sortType": "sys_name",
                },
                "force": 1,
                "flags": self.RESOURCE_PEOPLE_FLAGS,
                "from": offset,
                "to": offset + limit - 1,
            },
        )
        if not isinstance(body, dict) or not isinstance(body.get("items"), list):
            raise WialonConnectionError(
                "El servicio de telemetría devolvió recursos en un formato inválido."
            )
        resources = [
            resource
            for item in body["items"]
            if isinstance(item, dict)
            if (resource := resource_from_wialon(item)) is not None
        ]
        total = body.get("totalItemsCount")
        if isinstance(total, bool) or not isinstance(total, int):
            total = len(resources)
        return WialonResourceSearchResult(items=resources, total=max(0, total))

    def load_vehicle_history(
        self,
        unit_id: int,
        time_from: int,
        time_to: int,
        *,
        load_count: int,
    ) -> WialonHistoryResult:
        body = self._request("messages/load_interval", {
            "itemId": unit_id,
            "timeFrom": time_from,
            "timeTo": time_to,
            "flags": 1,
            "flagsMask": 0xFF01,
            "loadCount": load_count,
        })
        result = history_from_wialon(body)
        if result is None:
            raise WialonConnectionError(
                "El servicio de telemetría devolvió el historial en un formato inválido."
            )
        return result

    def get_resource(self, resource_id: int, flags: int) -> WialonResource | None:
        body = self._request(
            "core/search_item", {"id": resource_id, "flags": flags}
        )
        item = body.get("item") if isinstance(body, dict) else None
        if not isinstance(item, dict):
            raise WialonConnectionError(
                "El servicio de telemetría devolvió un recurso en formato inválido."
            )
        return resource_from_wialon(item)

    def list_drivers(
        self, resource_id: int, query: str | None, offset: int, limit: int
    ) -> tuple[list[WialonDriver], int]:
        resource = self.get_resource(resource_id, self.RESOURCE_DRIVER_FLAGS)
        if resource is None:
            return [], 0
        drivers = sorted(resource.drivers, key=lambda driver: driver.name.casefold())
        if query:
            needle = query.casefold()
            drivers = [
                driver for driver in drivers
                if needle in driver.name.casefold()
                or needle in driver.code.casefold()
                or needle in driver.phone.casefold()
            ]
        return drivers[offset : offset + limit], len(drivers)

    def get_driver(self, resource_id: int, driver_id: int) -> WialonDriver | None:
        resource = self.get_resource(resource_id, self.RESOURCE_DRIVER_FLAGS)
        if resource is None:
            return None
        return next((item for item in resource.drivers if item.id == driver_id), None)

    def create_driver(
        self,
        resource_id: int,
        *,
        name: str,
        code: str,
        description: str,
        phone: str,
        mobile_password: str,
        custom_fields: dict[str, str],
    ) -> WialonDriver:
        body = self._request(
            "resource/update_driver",
            {
                "itemId": resource_id,
                "id": 0,
                "callMode": "create",
                "n": name,
                "c": code,
                "ds": description,
                "p": phone,
                "pwd": mobile_password,
                "jp": custom_fields,
                "f": 0,
            },
        )
        return self._driver_from_update(body)

    def update_driver(
        self,
        resource_id: int,
        driver_id: int,
        *,
        name: str,
        code: str,
        description: str,
        phone: str,
        mobile_password: str,
        custom_fields: dict[str, str] | None = None,
        flags: int = 0,
    ) -> WialonDriver:
        params: dict[str, Any] = {
            "itemId": resource_id,
            "id": driver_id,
            "callMode": "update",
            "n": name,
            "c": code,
            "ds": description,
            "p": phone,
            "pwd": mobile_password,
            "f": flags,
        }
        if custom_fields is not None:
            params["jp"] = custom_fields
        return self._driver_from_update(self._request("resource/update_driver", params))

    def delete_driver(self, resource_id: int, driver_id: int) -> None:
        self._request(
            "resource/update_driver",
            {"itemId": resource_id, "id": driver_id, "callMode": "delete"},
        )

    @staticmethod
    def _driver_from_update(body: Any) -> WialonDriver:
        if (
            not isinstance(body, list)
            or len(body) < 2
            or not isinstance(body[1], dict)
        ):
            raise WialonConnectionError(
                "El servicio de telemetría devolvió un conductor en formato inválido."
            )
        resource = resource_from_wialon(
            {"id": 1, "nm": "", "drvrs": {str(body[1].get("id", "")): body[1]}}
        )
        if resource is None or not resource.drivers:
            raise WialonConnectionError(
                "El servicio de telemetría devolvió un conductor en formato inválido."
            )
        return resource.drivers[0]

    def list_passengers(
        self, resource_id: int, query: str | None, offset: int, limit: int
    ) -> tuple[list[WialonPassenger], int]:
        resource = self.get_resource(resource_id, self.RESOURCE_PASSENGER_FLAGS)
        if resource is None:
            return [], 0
        passengers = sorted(resource.passengers, key=lambda item: item.name.casefold())
        if query:
            needle = query.casefold()
            passengers = [
                item for item in passengers
                if needle in item.name.casefold() or needle in item.code.casefold()
            ]
        return passengers[offset : offset + limit], len(passengers)

    def get_passenger(self, resource_id: int, passenger_id: int) -> WialonPassenger | None:
        resource = self.get_resource(resource_id, self.RESOURCE_PASSENGER_FLAGS)
        if resource is None:
            return None
        return next((item for item in resource.passengers if item.id == passenger_id), None)

    def create_passenger(
        self,
        resource_id: int,
        *,
        name: str,
        code: str,
        phone: str,
        timezone: int,
        custom_fields: dict[str, str],
        image_checksum: int = 0,
    ) -> WialonPassenger:
        body = self._request(
            "resource/update_tag",
            {
                "itemId": resource_id,
                "id": 0,
                "callMode": "create",
                "n": name,
                "c": code,
                "p": phone,
                "tz": timezone,
                "ck": image_checksum,
                "jp": custom_fields,
            },
        )
        return self._passenger_from_update(body)

    def update_passenger(
        self,
        resource_id: int,
        passenger_id: int,
        *,
        name: str,
        code: str,
        phone: str,
        timezone: int,
        custom_fields: dict[str, str],
        image_checksum: int,
        flags: int,
        auto_reset_seconds: int,
    ) -> WialonPassenger:
        body = self._request(
            "resource/update_tag",
            {
                "itemId": resource_id,
                "id": passenger_id,
                "callMode": "update",
                "n": name,
                "c": code,
                "p": phone,
                "tz": timezone,
                "ck": image_checksum,
                "f": flags,
                "art": auto_reset_seconds,
                "jp": custom_fields,
            },
        )
        return self._passenger_from_update(body)

    def delete_passenger(self, resource_id: int, passenger_id: int) -> None:
        self._request(
            "resource/update_tag",
            {"itemId": resource_id, "id": passenger_id, "callMode": "delete"},
        )

    @staticmethod
    def _passenger_from_update(body: Any) -> WialonPassenger:
        if (
            not isinstance(body, list)
            or len(body) < 2
            or not isinstance(body[1], dict)
        ):
            raise WialonConnectionError(
                "El servicio de telemetría devolvió un pasajero en formato inválido."
            )
        passenger = body[1]
        resource = resource_from_wialon(
            {"id": 1, "nm": "", "tags": {str(passenger.get("id", "")): passenger}}
        )
        if resource is None or not resource.passengers:
            raise WialonConnectionError(
                "El servicio de telemetría devolvió un pasajero en formato inválido."
            )
        return resource.passengers[0]

    def get_unit_drivers(self, unit_id: int, resource_id: int) -> list[WialonUnitDriver]:
        body = self._request("resource/get_unit_drivers", {"unitId": unit_id})
        records = body.get(str(resource_id), []) if isinstance(body, dict) else []
        if not isinstance(records, list):
            raise WialonConnectionError("Respuesta inválida al consultar conductores vinculados.")
        return self._unit_drivers_from_records(records, resource_id)

    def get_unit_drivers_for_all_resources(self, unit_id: int) -> list[WialonUnitDriver]:
        body = self._request("resource/get_unit_drivers", {"unitId": unit_id})
        if not isinstance(body, dict):
            raise WialonConnectionError("Respuesta inválida al consultar conductores vinculados.")
        result = []
        for resource_key, records in body.items():
            try:
                resource_id = int(resource_key)
            except (TypeError, ValueError):
                continue
            if not isinstance(records, list):
                continue
            result.extend(self._unit_drivers_from_records(records, resource_id))
        return result

    @staticmethod
    def _unit_drivers_from_records(
        records: list[Any], resource_id: int | None,
    ) -> list[WialonUnitDriver]:
        result = []
        for record in records:
            if not isinstance(record, dict):
                continue
            try:
                driver_id = int(record.get("id"))
            except (TypeError, ValueError):
                continue
            result.append(WialonUnitDriver(
                id=driver_id,
                name=record.get("nm") if isinstance(record.get("nm"), str) else "",
                phone=record.get("ph") if isinstance(record.get("ph"), str) else None,
                resource_id=resource_id,
            ))
        return result

    def bind_driver(self, resource_id: int, driver_id: int, unit_id: int, *, bind: bool, time: int = 0) -> None:
        self._request("resource/bind_unit_driver", {
            "resourceId": resource_id, "driverId": driver_id,
            "unitId": unit_id, "time": time, "mode": 1 if bind else 0,
        })

    def get_driver_bindings(
        self, resource_id: int, *, unit_id: int, driver_id: int,
        time_from: int, time_to: int,
    ) -> list[WialonBindingEvent]:
        body = self._request("resource/get_driver_bindings", {
            "resourceId": resource_id, "unitId": unit_id, "driverId": driver_id,
            "timeFrom": time_from, "timeTo": time_to,
        })
        return self._binding_events(body)

    def set_driver_auto_units(self, resource_id: int, unit_ids: list[int]) -> list[int]:
        body = self._request("resource/update_driver_units", {
            "itemId": resource_id, "units": unit_ids,
        })
        units = body.get("drvrun") if isinstance(body, dict) else None
        if not isinstance(units, list):
            raise WialonConnectionError("Respuesta inválida al actualizar asignación automática.")
        return [int(unit_id) for unit_id in units if isinstance(unit_id, int) and not isinstance(unit_id, bool)]

    def get_driver_auto_units(self, resource_id: int) -> tuple[bool, list[int]]:
        resource = self.get_resource(resource_id, self.RESOURCE_DRIVER_AUTO_FLAGS)
        if resource is None:
            return False, []
        return "drvrun" in resource.available_fields, list(resource.driver_auto_unit_ids)

    def get_unit_passengers(self, unit_id: int, resource_id: int) -> list[WialonPassenger]:
        resource = self.get_resource(resource_id, self.RESOURCE_PASSENGER_FLAGS)
        if resource is None:
            return []
        return [item for item in resource.passengers if item.bound_unit_id == unit_id]

    def bind_passenger(self, resource_id: int, passenger_id: int, unit_id: int, *, bind: bool, time: int = 0) -> None:
        self._request("resource/bind_unit_tag", {
            "resourceId": resource_id, "tagId": passenger_id,
            "unitId": unit_id, "time": time, "mode": 1 if bind else 0,
        })

    def get_passenger_bindings(
        self, resource_id: int, *, unit_id: int, passenger_id: int,
        time_from: int, time_to: int,
    ) -> list[WialonBindingEvent]:
        body = self._request("resource/get_tag_bindings", {
            "resourceId": resource_id, "unitId": unit_id, "tagId": passenger_id,
            "timeFrom": time_from, "timeTo": time_to,
        })
        return self._binding_events(body, tag=True)

    @staticmethod
    def _binding_events(body: Any, *, tag: bool = False) -> list[WialonBindingEvent]:
        if not isinstance(body, dict):
            raise WialonConnectionError("Respuesta inválida al consultar vinculaciones.")
        events = []
        for subject_key, records in body.items():
            try:
                subject_id = int(subject_key)
            except (TypeError, ValueError):
                continue
            if not isinstance(records, list):
                continue
            for record in records:
                if not isinstance(record, dict):
                    continue
                timestamp = record.get("t")
                unit_id = record.get("u")
                if not isinstance(timestamp, int) or isinstance(timestamp, bool):
                    continue
                if not isinstance(unit_id, int) or isinstance(unit_id, bool):
                    continue
                previous = record.get("pu") if tag else None
                events.append(WialonBindingEvent(
                    timestamp=timestamp,
                    unit_id=unit_id,
                    previous_unit_id=previous if isinstance(previous, int) else None,
                    subject_id=subject_id,
                ))
        return sorted(events, key=lambda event: event.timestamp)
