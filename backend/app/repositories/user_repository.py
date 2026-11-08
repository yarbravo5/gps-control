from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models import Role, User


def get_user_by_id(database_session: Session, user_id: int) -> User | None:
    return database_session.get(User, user_id)


def get_user_by_email(database_session: Session, email: str) -> User | None:
    normalized_email = email.strip().lower()
    return database_session.scalar(
        select(User).where(func.lower(User.email) == normalized_email)
    )


def list_users(
    database_session: Session,
    offset: int = 0,
    limit: int = 100,
    sort_by: str = "id",
    sort_order: str = "asc",
    query: str | None = None,
    role_name: str | None = None,
) -> list[User]:
    sort_columns = {"name": User.name, "email": User.email, "role": Role.name, "id": User.id}
    column = sort_columns[sort_by]
    ordering = desc(column) if sort_order == "desc" else asc(column)
    statement = select(User)
    if sort_by == "role" or role_name:
        statement = statement.join(User.role)
    if query:
        needle = f"%{query.strip().lower()}%"
        statement = statement.where(
            or_(func.lower(User.name).like(needle), func.lower(User.email).like(needle))
        )
    if role_name:
        statement = statement.where(Role.name == role_name)
    return list(
        database_session.scalars(
            statement.order_by(ordering, User.id.asc()).offset(offset).limit(limit)
        )
    )


def count_users(
    database_session: Session,
    query: str | None = None,
    role_name: str | None = None,
) -> int:
    statement = select(func.count(User.id))
    if role_name:
        statement = statement.join(User.role).where(Role.name == role_name)
    if query:
        needle = f"%{query.strip().lower()}%"
        statement = statement.where(
            or_(func.lower(User.name).like(needle), func.lower(User.email).like(needle))
        )
    return int(database_session.scalar(statement) or 0)


def get_role_by_name(database_session: Session, role_name: str) -> Role | None:
    return database_session.scalar(select(Role).where(Role.name == role_name))


def email_exists(
    database_session: Session,
    email: str,
    exclude_user_id: int | None = None,
) -> bool:
    normalized_email = email.strip().lower()
    statement = select(User.id).where(func.lower(User.email) == normalized_email)
    if exclude_user_id is not None:
        statement = statement.where(User.id != exclude_user_id)
    return database_session.scalar(statement) is not None


def count_active_admins(database_session: Session) -> int:
    total = database_session.scalar(
        select(func.count(User.id))
        .join(Role)
        .where(Role.name == "admin", User.is_active.is_(True))
    )
    return int(total or 0)


def create_user(
    database_session: Session,
    *,
    email: str,
    name: str,
    password_hash: str,
    role: Role,
    must_change_password: bool = True,
) -> User:
    user = User(
        email=email.strip().lower(),
        name=name.strip(),
        password_hash=password_hash,
        role=role,
        is_active=True,
        must_change_password=must_change_password,
    )
    database_session.add(user)
    database_session.flush()
    return user
