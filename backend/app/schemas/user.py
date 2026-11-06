from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.validation import validate_password_strength


RoleName = Literal["admin", "operator", "viewer"]


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    role: RoleName = "viewer"

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, password: str) -> str:
        return validate_password_strength(password)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, name: str) -> str:
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("El nombre no puede estar vacío.")
        return normalized_name


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    role: RoleName | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, name: str | None) -> str | None:
        if name is None:
            return None
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("El nombre no puede estar vacío.")
        return normalized_name


class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_must_be_strong(cls, password: str) -> str:
        return validate_password_strength(password)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    role: str
    is_active: bool
    must_change_password: bool
    created_at: datetime
    last_login_at: datetime | None

    @field_validator("role", mode="before")
    @classmethod
    def role_name(cls, value: object) -> object:
        return value.name if hasattr(value, "name") else value


class CurrentUserResponse(UserResponse):
    permissions: list[str]
