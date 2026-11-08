from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import User
from tests.conftest import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    OPERATOR_EMAIL,
    OPERATOR_PASSWORD,
    VIEWER_EMAIL,
    VIEWER_PASSWORD,
    login,
)


def test_login_me_refresh_and_logout(client: TestClient) -> None:
    login_data = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {login_data['access_token']}"}

    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["role"] == "admin"
    assert "users:manage" in me_response.json()["permissions"]

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": login_data["csrf_token"]},
    )
    assert refresh_response.status_code == 200
    refreshed_data = refresh_response.json()
    assert refreshed_data["access_token"]

    logout_response = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": refreshed_data["csrf_token"]},
    )
    assert logout_response.status_code == 204

    refresh_after_logout = client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": refreshed_data["csrf_token"]},
    )
    assert refresh_after_logout.status_code == 401


def test_viewer_cannot_manage_users(client: TestClient) -> None:
    login_data = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {login_data['access_token']}"},
    )

    assert response.status_code == 403


def test_operator_cannot_manage_users_or_escalate_role(client: TestClient) -> None:
    operator_login = login(client, OPERATOR_EMAIL, OPERATOR_PASSWORD)
    operator_headers = {
        "Authorization": f"Bearer {operator_login['access_token']}"
    }

    list_response = client.get("/api/v1/users", headers=operator_headers)
    escalation_response = client.patch(
        "/api/v1/users/1",
        headers=operator_headers,
        json={"role": "admin", "is_active": True},
    )

    assert list_response.status_code == 403
    assert escalation_response.status_code == 403


def test_role_changes_apply_to_an_existing_access_token(client: TestClient) -> None:
    admin_login = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
    create_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "role-change@gpscontrol.com",
            "name": "Usuario de prueba",
            "password": "RoleChange123!Password",
            "role": "viewer",
        },
    )
    assert create_response.status_code == 201

    first_login = login(
        client,
        "role-change@gpscontrol.com",
        "RoleChange123!Password",
    )
    user_headers = {"Authorization": f"Bearer {first_login['access_token']}"}
    assert client.get("/api/v1/users", headers=user_headers).status_code == 403

    password_change = client.post(
        "/api/v1/auth/change-password",
        headers=user_headers,
        json={
            "current_password": "RoleChange123!Password",
            "new_password": "RoleChange456!Password",
        },
    )
    assert password_change.status_code == 204
    renewed_login = login(
        client,
        "role-change@gpscontrol.com",
        "RoleChange456!Password",
    )
    user_headers = {"Authorization": f"Bearer {renewed_login['access_token']}"}

    promoted = client.patch(
        f"/api/v1/users/{create_response.json()['id']}",
        headers=admin_headers,
        json={"role": "admin"},
    )
    assert promoted.status_code == 200
    assert client.get("/api/v1/users", headers=user_headers).status_code == 200

    demoted = client.patch(
        f"/api/v1/users/{create_response.json()['id']}",
        headers=admin_headers,
        json={"role": "viewer"},
    )
    assert demoted.status_code == 200
    assert client.get("/api/v1/users", headers=user_headers).status_code == 403


def test_viewer_cannot_write_by_changing_resource_and_entity_ids(
    client: TestClient,
) -> None:
    viewer_login = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
    viewer_headers = {"Authorization": f"Bearer {viewer_login['access_token']}"}

    driver_response = client.patch(
        "/api/v1/drivers/999?resource_id=999",
        headers=viewer_headers,
        json={"name": "Escalated"},
    )
    passenger_response = client.post(
        "/api/v1/passengers",
        headers=viewer_headers,
        json={"resource_id": 999, "name": "Escalated", "code": "X999", "phone": "123"},
    )

    assert driver_response.status_code == 403
    assert passenger_response.status_code == 403


def test_admin_can_create_update_and_deactivate_user(
    client: TestClient,
    database_session,
) -> None:
    login_data = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    auth_headers = {"Authorization": f"Bearer {login_data['access_token']}"}

    create_response = client.post(
        "/api/v1/users",
        headers=auth_headers,
        json={
            "email": "managed.operator@gpscontrol.com",
            "name": "Operador",
            "password": "Operator123!ChangeMe",
            "role": "operator",
        },
    )
    assert create_response.status_code == 201, create_response.text
    created_user = create_response.json()
    assert created_user["role"] == "operator"
    assert created_user["must_change_password"] is True

    update_response = client.patch(
        f"/api/v1/users/{created_user['id']}",
        headers=auth_headers,
        json={"name": "Operador Actualizado", "role": "viewer"},
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["name"] == "Operador Actualizado"
    assert update_response.json()["role"] == "viewer"

    deactivate_response = client.delete(
        f"/api/v1/users/{created_user['id']}",
        headers=auth_headers,
    )
    assert deactivate_response.status_code == 204

    database_session.expire_all()
    deactivated_user = database_session.scalar(
        select(User).where(User.id == created_user["id"])
    )
    assert deactivated_user is not None
    assert deactivated_user.is_active is False


def test_new_user_must_change_password_before_using_permissions(
    client: TestClient,
) -> None:
    admin_login = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}

    create_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "newuser@gpscontrol.com",
            "name": "Usuario Nuevo",
            "password": "NewUser123!ChangeMe",
            "role": "viewer",
        },
    )
    assert create_response.status_code == 201, create_response.text

    new_user_login = login(
        client,
        "newuser@gpscontrol.com",
        "NewUser123!ChangeMe",
    )
    new_user_headers = {
        "Authorization": f"Bearer {new_user_login['access_token']}"
    }

    blocked_response = client.get("/api/v1/users", headers=new_user_headers)
    assert blocked_response.status_code == 403
    assert "cambiar tu contraseña" in blocked_response.json()["detail"]

    change_response = client.post(
        "/api/v1/auth/change-password",
        headers=new_user_headers,
        json={
            "current_password": "NewUser123!ChangeMe",
            "new_password": "NewUser456!ChangeMe",
        },
    )
    assert change_response.status_code == 204

    old_access_response = client.get("/api/v1/auth/me", headers=new_user_headers)
    assert old_access_response.status_code == 401

    final_login = login(
        client,
        "newuser@gpscontrol.com",
        "NewUser456!ChangeMe",
    )
    assert final_login["user"]["must_change_password"] is False


def test_last_admin_cannot_deactivate_self(
    client: TestClient,
    database_session,
) -> None:
    login_data = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    auth_headers = {"Authorization": f"Bearer {login_data['access_token']}"}
    admin_user = database_session.scalar(
        select(User).where(User.email == ADMIN_EMAIL)
    )
    assert admin_user is not None

    response = client.delete(
        f"/api/v1/users/{admin_user.id}",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "propia cuenta" in response.json()["detail"]
