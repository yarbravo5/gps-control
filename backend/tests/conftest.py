import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.seed import seed_roles_and_permissions
from app.db.session import DatabaseBase, get_database_session
from app.main import app
from app.models import User
from app.repositories.user_repository import get_role_by_name


ADMIN_EMAIL = "admin@gpscontrol.com"
ADMIN_PASSWORD = "Admin123!ChangeMe"
VIEWER_EMAIL = "viewer@gpscontrol.com"
VIEWER_PASSWORD = "Viewer123!ChangeMe"


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    DatabaseBase.metadata.create_all(bind=engine)
    testing_session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )

    with testing_session_factory() as database_session:
        seed_roles_and_permissions(database_session)
        admin_role = get_role_by_name(database_session, "admin")
        viewer_role = get_role_by_name(database_session, "viewer")
        assert admin_role is not None
        assert viewer_role is not None
        database_session.add_all(
            [
                User(
                    email=ADMIN_EMAIL,
                    name="Administrador",
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role=admin_role,
                    is_active=True,
                    must_change_password=False,
                ),
                User(
                    email=VIEWER_EMAIL,
                    name="Visualizador",
                    password_hash=hash_password(VIEWER_PASSWORD),
                    role=viewer_role,
                    is_active=True,
                    must_change_password=False,
                ),
            ]
        )
        database_session.commit()

    yield testing_session_factory

    DatabaseBase.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def database_session(session_factory):
    with session_factory() as database_session:
        yield database_session


@pytest.fixture()
def client(session_factory):
    def override_get_database_session():
        database_session = session_factory()
        try:
            yield database_session
        finally:
            database_session.close()

    app.dependency_overrides[get_database_session] = override_get_database_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def login(client: TestClient, email: str, password: str) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()
