from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.dto.vehicle import VehicleStatus


class VehicleCustomFieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    value: str


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float | None
    longitude: float | None
    speed_kmh: float | None
    heading_degrees: float | None
    direction: str | None
    last_communication: datetime | None
    status: VehicleStatus
    custom_fields: list[VehicleCustomFieldResponse] = Field(default_factory=list)


class VehicleCustomFieldInput(BaseModel):
    id: int | None = Field(default=None, ge=0)
    name: str = Field(min_length=1, max_length=100)
    value: str = Field(max_length=500)


class VehicleCustomFieldsUpdate(BaseModel):
    fields: list[VehicleCustomFieldInput] = Field(default_factory=list, max_length=50)
    remove_field_ids: list[int] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def validate_changes(self):
        if not self.fields and not self.remove_field_ids:
            raise ValueError("Debes indicar campos para crear, actualizar o eliminar.")
        if len(self.remove_field_ids) != len(set(self.remove_field_ids)):
            raise ValueError("No puedes eliminar el mismo campo dos veces.")
        if any(field_id <= 0 for field_id in self.remove_field_ids):
            raise ValueError("Los IDs de campos a eliminar deben ser positivos.")
        update_ids = [field.id for field in self.fields if field.id]
        if len(update_ids) != len(set(update_ids)):
            raise ValueError("No puedes actualizar el mismo campo dos veces.")
        if set(update_ids) & set(self.remove_field_ids):
            raise ValueError("Un campo no puede actualizarse y eliminarse en la misma solicitud.")
        names = [field.name.strip() for field in self.fields]
        if any(not name for name in names):
            raise ValueError("El nombre del campo no puede estar vacío.")
        if len(names) != len(set(names)):
            raise ValueError("No puedes repetir el nombre de un campo en la misma solicitud.")
        return self


class VehicleListResponse(BaseModel):
    items: list[VehicleResponse]
    total: int
    offset: int
    limit: int


class VehicleDriverResponse(BaseModel):
    id: int
    name: str
    phone: str | None


class VehiclePassengerResponse(BaseModel):
    id: int
    name: str
    code: str


class VehicleDetailResponse(VehicleResponse):
    drivers: list[VehicleDriverResponse]
    passengers: list[VehiclePassengerResponse]
