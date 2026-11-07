from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import DatabaseSessionFactory
from app.models import Permission, Role, User


PERMISSION_CATALOG = [
    ("dashboard:view", "Ver dashboard"),
    ("vehicles:view", "Ver vehículos y mapa"),
    ("vehicles:custom_fields:write", "Editar campos personalizados de vehículos"),
    ("drivers:view", "Ver conductores"),
    ("drivers:write", "Crear, editar y eliminar conductores"),
    ("drivers:bind", "Vincular conductores a vehículos"),
    ("passengers:view", "Ver pasajeros"),
    ("passengers:write", "Crear, editar y eliminar pasajeros"),
    ("passengers:bind", "Vincular pasajeros a vehículos"),
    ("history:view", "Ver historial de recorridos"),
    ("export:csv", "Exportar datos a CSV"),
    ("users:manage", "Gestionar usuarios y roles"),
    ("audit:view", "Ver registro de auditoría"),
]

ROLE_DESCRIPTIONS_BY_NAME = {
    "admin": "Acceso total al sistema",
    "operator": "Gestión operativa de la flota",
    "viewer": "Acceso de solo lectura",
}

PERMISSIONS_BY_ROLE = {
    "admin": [code for code, _ in PERMISSION_CATALOG],
    "operator": [
        code
        for code, _ in PERMISSION_CATALOG
        if code not in {"users:manage", "audit:view"}
    ],
    "viewer": [
        "dashboard:view",
        "vehicles:view",
        "drivers:view",
        "passengers:view",
        "history:view",
    ],
}


def seed_roles_and_permissions(database_session: Session) -> None:
    permission_by_code: dict[str, Permission] = {}

    for code, description in PERMISSION_CATALOG:
        permission = database_session.scalar(
            select(Permission).where(Permission.code == code)
        )
        if permission is None:
            permission = Permission(code=code, description=description)
            database_session.add(permission)
            database_session.flush()
        permission_by_code[code] = permission

    for role_name, permission_codes in PERMISSIONS_BY_ROLE.items():
        role = database_session.scalar(select(Role).where(Role.name == role_name))
        if role is None:
            role = Role(
                name=role_name,
                description=ROLE_DESCRIPTIONS_BY_NAME[role_name],
            )
            database_session.add(role)
            database_session.flush()

        role.permissions = [permission_by_code[code] for code in permission_codes]

    database_session.commit()


def seed_admin_user(database_session: Session) -> None:
    admin_email = settings.admin_email.strip().lower()
    admin_password = settings.admin_password

    if not admin_email or not admin_password:
        return

    existing_user = database_session.scalar(
        select(User).where(User.email == admin_email)
    )
    if existing_user is not None:
        return

    admin_role = database_session.scalar(
        select(Role).where(Role.name == "admin")
    )
    if admin_role is None:
        raise RuntimeError("No se encontró el rol admin para crear el administrador.")

    admin_user = User(
        email=admin_email,
        name=settings.admin_name.strip() or "Administrador",
        password_hash=hash_password(admin_password),
        role=admin_role,
        is_active=True,
        must_change_password=False,
    )
    database_session.add(admin_user)
    database_session.commit()
    print(f"Administrador inicial creado: {admin_email}")


def run_seed() -> None:
    with DatabaseSessionFactory() as database_session:
        seed_roles_and_permissions(database_session)
        seed_admin_user(database_session)
    print("Seed completado.")


if __name__ == "__main__":
    run_seed()
