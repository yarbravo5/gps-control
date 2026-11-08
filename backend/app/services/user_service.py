from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import User
from app.repositories import (
    refresh_token_repository,
    user_repository,
)
from app.schemas.user import UserCreate, UserUpdate
from app.services import audit_service


class UserNotFoundError(Exception):
    pass


class UserEmailAlreadyExistsError(Exception):
    pass


class RoleNotFoundError(Exception):
    pass


class InvalidUserOperationError(Exception):
    pass


def list_users(
    database_session: Session,
    offset: int = 0,
    limit: int = 100,
    sort_by: str = "id",
    sort_order: str = "asc",
    query: str | None = None,
    role_name: str | None = None,
) -> list[User]:
    return user_repository.list_users(
        database_session,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        query=query,
        role_name=role_name,
    )


def count_users(database_session: Session, query: str | None = None, role_name: str | None = None) -> int:
    return user_repository.count_users(database_session, query=query, role_name=role_name)


def create_user(
    database_session: Session,
    *,
    user_data: UserCreate,
    actor: User,
    ip_address: str | None,
) -> User:
    if user_repository.email_exists(database_session, user_data.email):
        raise UserEmailAlreadyExistsError

    role = user_repository.get_role_by_name(database_session, user_data.role)
    if role is None:
        raise RoleNotFoundError

    user = user_repository.create_user(
        database_session,
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        role=role,
        must_change_password=True,
    )
    audit_service.record_audit(
        database_session,
        user_id=actor.id,
        action="user.created",
        entity="user",
        entity_id=str(user.id),
        details={"email": user.email, "role": role.name},
        ip_address=ip_address,
    )
    database_session.commit()
    return user


def update_user(
    database_session: Session,
    *,
    user_id: int,
    user_data: UserUpdate,
    actor: User,
    ip_address: str | None,
) -> User:
    user = user_repository.get_user_by_id(database_session, user_id)
    if user is None:
        raise UserNotFoundError

    changes: dict[str, object] = {}

    if user_data.role is not None and user_data.role != user.role.name:
        if user.id == actor.id:
            raise InvalidUserOperationError(
                "No puedes cambiar tu propio rol."
            )

        new_role = user_repository.get_role_by_name(
            database_session,
            user_data.role,
        )
        if new_role is None:
            raise RoleNotFoundError

        if (
            user.role.name == "admin"
            and user_repository.count_active_admins(database_session) <= 1
        ):
            raise InvalidUserOperationError(
                "No puedes quitar el rol al último administrador activo."
            )

        changes["role"] = {
            "from": user.role.name,
            "to": new_role.name,
        }
        user.role = new_role

    if user_data.name is not None and user_data.name.strip() != user.name:
        changes["name"] = {
            "from": user.name,
            "to": user_data.name.strip(),
        }
        user.name = user_data.name.strip()

    if user_data.is_active is not None and user_data.is_active != user.is_active:
        if user.id == actor.id and not user_data.is_active:
            raise InvalidUserOperationError(
                "No puedes desactivar tu propia cuenta."
            )

        if (
            not user_data.is_active
            and user.role.name == "admin"
            and user_repository.count_active_admins(database_session) <= 1
        ):
            raise InvalidUserOperationError(
                "No puedes desactivar al último administrador activo."
            )

        changes["is_active"] = {
            "from": user.is_active,
            "to": user_data.is_active,
        }
        user.is_active = user_data.is_active

        if not user.is_active:
            user.token_version += 1
            refresh_token_repository.revoke_all_refresh_tokens_for_user(
                database_session,
                user.id,
            )

    if changes:
        audit_service.record_audit(
            database_session,
            user_id=actor.id,
            action="user.updated",
            entity="user",
            entity_id=str(user.id),
            details=changes,
            ip_address=ip_address,
        )
        database_session.commit()

    return user


def reset_password(
    database_session: Session,
    *,
    user_id: int,
    new_password: str,
    actor: User,
    ip_address: str | None,
) -> User:
    user = user_repository.get_user_by_id(database_session, user_id)
    if user is None:
        raise UserNotFoundError

    user.password_hash = hash_password(new_password)
    user.must_change_password = True
    user.token_version += 1
    refresh_token_repository.revoke_all_refresh_tokens_for_user(
        database_session,
        user.id,
    )
    audit_service.record_audit(
        database_session,
        user_id=actor.id,
        action="user.password_reset",
        entity="user",
        entity_id=str(user.id),
        ip_address=ip_address,
    )
    database_session.commit()
    return user
