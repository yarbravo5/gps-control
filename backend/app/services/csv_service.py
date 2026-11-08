import csv
import io
from datetime import datetime
from typing import Protocol

from app.core.config import settings
from app.dto.vehicle import VehicleStatus
from app.gateways.wialon.dto import WialonResourceSearchResult, WialonUnitSearchResult
from app.mappers.people_mapper import map_driver, map_passenger
from app.mappers.vehicle_mapper import map_vehicle


class CsvGateway(Protocol):
    def search_items(
        self, query: str | None, offset: int, limit: int
    ) -> WialonUnitSearchResult: ...

    def search_resources(self, offset: int, limit: int) -> WialonResourceSearchResult: ...


def sanitize_csv_cell(value: object) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\x00", "")
    if text.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")):
        return "'" + text
    return text


def _render_csv(headers: list[str], rows: list[list[object]]) -> str:
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow([sanitize_csv_cell(header) for header in headers])
    for row in rows:
        writer.writerow([sanitize_csv_cell(cell) for cell in row])
    return output.getvalue()


def _all_resources(gateway: CsvGateway):
    resources = []
    offset = 0
    while True:
        page = gateway.search_resources(offset, 100)
        resources.extend(page.items)
        if not page.items or offset + len(page.items) >= page.total:
            break
        offset += len(page.items)
    return resources


def export_vehicles_csv(gateway: CsvGateway, *, now: datetime) -> str:
    rows = []
    offset = 0
    while True:
        page = gateway.search_items(None, offset, 100)
        rows.extend(
            [
                vehicle.id,
                vehicle.name,
                vehicle.latitude,
                vehicle.longitude,
                vehicle.speed_kmh,
                vehicle.heading_degrees,
                vehicle.direction,
                vehicle.last_communication.isoformat() if vehicle.last_communication else None,
                vehicle.status.value,
            ]
            for unit in page.items
            for vehicle in [map_vehicle(
                unit,
                now=now,
                no_signal_after_seconds=settings.wialon_no_signal_after_seconds,
            )]
        )
        if not page.items or offset + len(page.items) >= page.total:
            break
        offset += len(page.items)
    return _render_csv(
        ["id", "name", "latitude", "longitude", "speed_kmh", "heading_degrees", "direction", "last_communication", "status"],
        rows,
    )


def export_people_csv(gateway: CsvGateway, *, kind: str) -> str:
    resources = _all_resources(gateway)
    rows = []
    headers = ["id", "resource_id", "name", "code", "phone", "bound_unit_id", "custom_fields"]
    for resource in resources:
        if kind == "drivers":
            people = [map_driver(resource.id, person) for person in resource.drivers]
            for person in people:
                custom_fields = "; ".join(
                    f"{name}={value}" for name, value in sorted(person.custom_fields.items())
                )
                rows.append([
                    person.id, person.resource_id, person.name, person.code,
                    person.phone, person.bound_unit_id, custom_fields,
                ])
        elif kind == "passengers":
            people = [map_passenger(resource.id, person) for person in resource.passengers]
            for person in people:
                custom_fields = "; ".join(
                    f"{name}={value}" for name, value in sorted(person.custom_fields.items())
                )
                rows.append([
                    person.id, person.resource_id, person.name, person.code,
                    None, person.bound_unit_id, custom_fields,
                ])
        else:
            raise ValueError("Tipo de exportación desconocido.")
    return _render_csv(headers, rows)