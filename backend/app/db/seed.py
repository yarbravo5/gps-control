from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Permission, Role


PERMISSIONS = [
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

ROLE_DESCRIPTIONS = {
    "admin": "Acceso total al sistema",
    "operator": "Gestión operativa de la flota",
    "viewer": "Acceso de solo lectura",
}

ROLE_PERMISSIONS = {
    "admin": [code for code, _ in PERMISSIONS],
    "operator": [
        code
        for code, _ in PERMISSIONS
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


def seed_rbac(db: Session) -> None:
    permission_by_code: dict[str, Permission] = {}

    for code, description in PERMISSIONS:
        permission = db.scalar(select(Permission).where(Permission.code == code))
        if permission is None:
            permission = Permission(code=code, description=description)
            db.add(permission)
            db.flush()
        permission_by_code[code] = permission

    for role_name, permission_codes in ROLE_PERMISSIONS.items():
        role = db.scalar(select(Role).where(Role.name == role_name))
        if role is None:
            role = Role(
                name=role_name,
                description=ROLE_DESCRIPTIONS[role_name],
            )
            db.add(role)
            db.flush()

        role.permissions = [permission_by_code[code] for code in permission_codes]

    db.commit()


def main() -> None:
    with SessionLocal() as db:
        seed_rbac(db)
    print("Seed RBAC completado.")


if __name__ == "__main__":
    main()
