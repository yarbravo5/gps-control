import csv
import io
from datetime import datetime, timezone

import pytest

from app.gateways.wialon.dto import (
    WialonPosition,
    WialonResourceSearchResult,
    WialonUnit,
    WialonUnitSearchResult,
    resource_from_wialon,
)
from app.services.csv_service import (
    export_people_csv,
    export_vehicles_csv,
    sanitize_csv_cell,
)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("=1+1", "'=1+1"),
        ("+SUM(A1:A2)", "'+SUM(A1:A2)"),
        ("-2+3", "'-2+3"),
        ("@cmd", "'@cmd"),
        ("  =1+1", "'  =1+1"),
        ("\t=1+1", "'\t=1+1"),
        ("normal\x00text", "normaltext"),
        (None, ""),
    ],
)
def test_sanitize_csv_cell_neutralizes_formulas(value, expected):
    assert sanitize_csv_cell(value) == expected


class FakeCsvGateway:
    def search_items(self, query, offset, limit):
        units = [
            WialonUnit(
                42,
                "=HYPERLINK(\"https://bad.invalid\")",
                WialonPosition(1_800_000_000, 4.7, -74.1, 25, 90),
                1_800_000_000,
            ),
        ]
        return WialonUnitSearchResult(units[offset : offset + limit], len(units))

    def search_resources(self, offset, limit):
        resource = resource_from_wialon({
            "id": 20,
            "nm": "Flota",
            "drvrs": {
                "7": {"id": 7, "n": "=2+2", "c": "D1", "ds": "", "p": "+123", "pwd": "secret", "jp": {"=formula": "@SUM(A1)"}, "f": 0},
            },
            "tags": {
                "9": {"id": 9, "n": "Pasajero", "c": "P1", "ck": 0, "jp": {"+zone": "-cmd"}, "tz": 0, "f": 0, "art": 0},
            },
        })
        return WialonResourceSearchResult([resource] if offset == 0 else [], 1)


def parse_csv(content: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(content)))


def test_vehicle_export_uses_fixed_columns_and_sanitizes_remote_values():
    content = export_vehicles_csv(
        FakeCsvGateway(), now=datetime.fromtimestamp(1_800_000_000, tz=timezone.utc)
    )
    rows = parse_csv(content)

    assert rows[0] == [
        "id", "name", "latitude", "longitude", "speed_kmh",
        "heading_degrees", "direction", "last_communication", "status",
    ]
    assert rows[1][1] == "'=HYPERLINK(\"https://bad.invalid\")"
    assert rows[1][4] == "25"
    assert rows[1][8] == "moving"


def test_people_exports_sanitize_values_and_never_export_driver_password():
    gateway = FakeCsvGateway()
    driver_rows = parse_csv(export_people_csv(gateway, kind="drivers"))
    passenger_rows = parse_csv(export_people_csv(gateway, kind="passengers"))

    assert driver_rows[1][2] == "'=2+2"
    assert driver_rows[1][4] == "'+123"
    assert driver_rows[1][6] == "'=formula=@SUM(A1)"
    assert "secret" not in repr(driver_rows)
    assert passenger_rows[1][6] == "'+zone=-cmd"