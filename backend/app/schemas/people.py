from pydantic import BaseModel, ConfigDict, Field, model_validator


class DriverCreate(BaseModel):
    resource_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(max_length=100)
    description: str = Field(max_length=500)
    phone: str = Field(max_length=50)
    mobile_password: str = Field(min_length=1, max_length=100)
    custom_fields: dict[str, str] = Field(default_factory=dict, max_length=50)


class DriverUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    code: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=50)
    mobile_password: str | None = Field(default=None, max_length=100)
    custom_fields: dict[str, str] | None = Field(default=None, max_length=50)
    remove_custom_fields: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def reject_explicit_nulls(self):
        for field in self.model_fields_set:
            if field != "remove_custom_fields" and getattr(self, field) is None:
                raise ValueError(f"{field} no puede ser null; usa cadena vacía para limpiarlo.")
        if not self.model_fields_set - {"remove_custom_fields"} and not self.remove_custom_fields:
            raise ValueError("Debes indicar al menos un cambio.")
        return self


class PassengerCreate(BaseModel):
    resource_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(max_length=100)
    phone: str = Field(max_length=50)
    timezone: int = Field(default=0, ge=-720, le=840)
    custom_fields: dict[str, str] = Field(default_factory=dict, max_length=50)


class PassengerUpdate(BaseModel):
    # Wialon does not return a tag's phone number; include it explicitly to prevent loss.
    phone: str = Field(max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=150)
    code: str | None = Field(default=None, max_length=100)
    timezone: int | None = Field(default=None, ge=-720, le=840)
    custom_fields: dict[str, str] = Field(default_factory=dict, max_length=50)
    remove_custom_fields: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def reject_explicit_nulls_and_empty_patch(self):
        for field in self.model_fields_set:
            if field not in {"custom_fields", "remove_custom_fields"} and getattr(self, field) is None:
                raise ValueError(f"{field} no puede ser null; usa cadena vacía para limpiarlo.")
        if not self.model_fields_set - {"phone", "custom_fields", "remove_custom_fields"} \
                and not self.custom_fields and not self.remove_custom_fields:
            raise ValueError("Debes indicar algún cambio además del teléfono requerido.")
        return self


class PassengerCustomFieldsUpdate(BaseModel):
    phone: str = Field(max_length=50)
    custom_fields: dict[str, str] = Field(default_factory=dict, max_length=50)
    remove_custom_fields: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def require_custom_field_changes(self):
        if not self.custom_fields and not self.remove_custom_fields:
            raise ValueError("Debes indicar campos para agregar, actualizar o eliminar.")
        return self


class DriverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_id: int
    name: str
    code: str
    description: str
    phone: str
    custom_fields: dict[str, str]
    bound_unit_id: int | None


class PassengerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_id: int
    name: str
    code: str
    timezone: int
    custom_fields: dict[str, str]
    bound_unit_id: int | None


class DriverListResponse(BaseModel):
    items: list[DriverResponse]
    total: int
    offset: int
    limit: int


class PassengerListResponse(BaseModel):
    items: list[PassengerResponse]
    total: int
    offset: int
    limit: int


class BindingResponse(BaseModel):
    subject_id: int
    timestamp: int
    unit_id: int
    previous_unit_id: int | None = None


class BindingRequest(BaseModel):
    resource_id: int = Field(gt=0)
    unit_id: int = Field(gt=0)
    time: int = Field(default=0, ge=0)


class BindingHistoryQuery(BaseModel):
    resource_id: int = Field(gt=0)
    unit_id: int = Field(default=0, ge=0)
    time_from: int = Field(ge=0)
    time_to: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_interval(self):
        if self.time_to < self.time_from:
            raise ValueError("time_to debe ser mayor o igual a time_from.")
        return self


class AutomaticUnitsUpdate(BaseModel):
    add_unit_ids: list[int] = Field(default_factory=list, max_length=500)
    remove_unit_ids: list[int] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def validate_ids(self):
        all_ids = self.add_unit_ids + self.remove_unit_ids
        if any(unit_id <= 0 for unit_id in all_ids):
            raise ValueError("Los IDs de unidades deben ser positivos.")
        if set(self.add_unit_ids) & set(self.remove_unit_ids):
            raise ValueError("Una unidad no puede agregarse y quitarse en la misma solicitud.")
        return self


class AutomaticUnitsResponse(BaseModel):
    resource_id: int
    unit_ids: list[int]


class UnitPersonResponse(BaseModel):
    resource_id: int
    unit_id: int
    person_id: int
    name: str
    phone: str | None = None
