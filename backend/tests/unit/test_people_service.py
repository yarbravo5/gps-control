import pytest

from app.gateways.wialon.dto import WialonDriver, WialonPassenger
from app.schemas.people import DriverUpdate, PassengerUpdate
from app.services import people_service as service


def driver(**overrides):
    values = dict(
        id=7, name="Ana", code="A7", description="Turno AM", phone="555",
        mobile_password="secret", custom_fields={"area": "norte", "tipo": "fijo"},
        flags=3, bound_unit_id=None,
        available_fields=frozenset({"id", "n", "c", "ds", "p", "pwd", "jp", "f", "bu"}),
    )
    values.update(overrides)
    return WialonDriver(**values)


def passenger(**overrides):
    values = dict(
        id=9, name="Luis", code="P9", timezone=-300,
        custom_fields={"alergia": "ninguna", "grupo": "A"}, image_checksum=4,
        flags=2, auto_reset_seconds=60, bound_unit_id=None,
        available_fields=frozenset({"id", "n", "c", "ck", "jp", "tz", "f", "art", "bu"}),
    )
    values.update(overrides)
    return WialonPassenger(**values)


class FakeGateway:
    def __init__(self):
        self.driver = driver()
        self.passenger = passenger()
        self.calls = []

    def get_driver(self, resource_id, person_id):
        return self.driver if person_id == self.driver.id else None

    def update_driver(self, resource_id, person_id, **fields):
        self.calls.append(("update_driver", resource_id, person_id, fields))
        self.driver = driver(
            name=fields["name"], code=fields["code"], description=fields["description"],
            phone=fields["phone"], mobile_password=fields["mobile_password"],
            custom_fields=fields["custom_fields"] or self.driver.custom_fields,
        )
        return self.driver

    def get_passenger(self, resource_id, person_id):
        return self.passenger if person_id == self.passenger.id else None

    def update_passenger(self, resource_id, person_id, **fields):
        self.calls.append(("update_passenger", resource_id, person_id, fields))
        self.passenger = passenger(
            name=fields["name"], code=fields["code"], timezone=fields["timezone"],
            custom_fields=fields["custom_fields"], image_checksum=fields["image_checksum"],
            flags=fields["flags"], auto_reset_seconds=fields["auto_reset_seconds"],
        )
        return self.passenger

    def bind_driver(self, resource_id, driver_id, unit_id, *, bind, time=0):
        self.calls.append(("bind_driver", resource_id, driver_id, unit_id, bind, time))

    def bind_passenger(self, resource_id, passenger_id, unit_id, *, bind, time=0):
        self.calls.append(("bind_passenger", resource_id, passenger_id, unit_id, bind, time))

    def get_driver_auto_units(self, resource_id):
        self.calls.append(("get_driver_auto_units", resource_id))
        return True, [10, 11]

    def set_driver_auto_units(self, resource_id, unit_ids):
        self.calls.append(("set_driver_auto_units", resource_id, unit_ids))
        return unit_ids


def test_driver_patch_preserves_untouched_values_and_allows_intentional_empty():
    gateway = FakeGateway()
    parsed = DriverUpdate(description="").model_dump(exclude_unset=True)
    result = service.update_driver(gateway, resource_id=2, driver_id=7, changes=parsed)
    sent = gateway.calls[-1][3]
    assert sent["description"] == ""
    assert sent["name"] == "Ana" and sent["code"] == "A7" and sent["phone"] == "555"
    assert sent["mobile_password"] == "secret" and sent["custom_fields"] is None
    assert result.custom_fields == {"area": "norte", "tipo": "fijo"}


def test_driver_custom_field_patch_merges_without_deleting_unmentioned_fields():
    gateway = FakeGateway()
    service.update_driver(
        gateway, resource_id=2, driver_id=7,
        changes={"custom_fields": {"area": "sur"}},
    )
    assert gateway.calls[-1][3]["custom_fields"] == {"area": "sur", "tipo": "fijo"}


def test_passenger_patch_preserves_jp_and_requires_explicit_phone():
    with pytest.raises(ValueError):
        PassengerUpdate(name="Luis")
    gateway = FakeGateway()
    parsed = PassengerUpdate(phone="", name="Luis M.").model_dump(exclude_unset=True)
    phone = parsed.pop("phone")
    changes = {k: v for k, v in parsed.items() if k not in {"phone"}}
    result = service.update_passenger(
        gateway, resource_id=2, passenger_id=9, changes=changes, phone=phone
    )
    sent = gateway.calls[-1][3]
    assert sent["phone"] == ""
    assert sent["custom_fields"] == {"alergia": "ninguna", "grupo": "A"}
    assert sent["code"] == "P9" and sent["timezone"] == -300
    assert result.custom_fields == sent["custom_fields"]


def test_passenger_patch_fails_closed_when_custom_fields_were_not_returned():
    gateway = FakeGateway()
    gateway.passenger = passenger(
        available_fields=frozenset({"id", "n", "c", "ck", "tz", "f", "art", "bu"})
    )

    with pytest.raises(service.UnsafePartialUpdateError):
        service.update_passenger(
            gateway, resource_id=2, passenger_id=9,
            changes={"name": "Luis M."}, phone="555",
        )

    assert gateway.calls == []


def test_passenger_custom_field_remove_is_explicit_and_retains_other_fields():
    gateway = FakeGateway()
    service.update_passenger(
        gateway, resource_id=2, passenger_id=9,
        changes={"remove_custom_fields": ["alergia"]}, phone="555",
    )
    assert gateway.calls[-1][3]["custom_fields"] == {"grupo": "A"}


@pytest.mark.parametrize("kind", ["driver", "passenger"])
@pytest.mark.parametrize("bind", [True, False])
def test_binding_calls_preserve_direction_and_ids(kind, bind):
    gateway = FakeGateway()
    if kind == "driver":
        service.bind_driver(gateway, resource_id=2, driver_id=7, unit_id=12, bind=bind, time=123)
    else:
        service.bind_passenger(gateway, resource_id=2, passenger_id=9, unit_id=12, bind=bind, time=123)
    assert gateway.calls[-1][-3:] == (12, bind, 123)


def test_auto_units_replacement_merges_existing_ids():
    gateway = FakeGateway()
    result = service.update_driver_automatic_units(
        gateway, resource_id=2, add_unit_ids=[12], remove_unit_ids=[10]
    )
    assert result.unit_ids == [11, 12]
    assert gateway.calls[-1] == ("set_driver_auto_units", 2, [11, 12])


def test_driver_update_fails_closed_when_password_is_not_readable():
    gateway = FakeGateway()
    gateway.driver = driver(mobile_password=None, available_fields=frozenset({"n", "c", "ds", "p", "f"}))
    with pytest.raises(service.UnsafePartialUpdateError):
        service.update_driver(gateway, resource_id=2, driver_id=7, changes={"name": "Ana M"})


@pytest.mark.parametrize("person_kind", ["driver", "passenger"])
def test_delete_fails_closed_when_binding_state_was_not_returned(person_kind):
    gateway = FakeGateway()
    gateway.driver = driver(available_fields=frozenset({"n", "c", "ds", "p", "pwd", "f"}))
    gateway.passenger = passenger(available_fields=frozenset({"n", "c", "ck", "jp", "tz", "f", "art"}))
    delete = service.delete_driver if person_kind == "driver" else service.delete_passenger
    with pytest.raises(service.UnsafePartialUpdateError):
        delete(gateway, resource_id=2, driver_id=7) if person_kind == "driver" else delete(
            gateway, resource_id=2, passenger_id=9
        )

