from fastapi.testclient import TestClient

from tests.conftest import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    OPERATOR_EMAIL,
    OPERATOR_PASSWORD,
    VIEWER_EMAIL,
    VIEWER_PASSWORD,
    login,
)


def test_only_admin_can_read_audit_logs(client: TestClient):
    admin = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_response = client.get(
        "/api/v1/audit",
        headers={"Authorization": f"Bearer {admin['access_token']}"},
    )
    assert admin_response.status_code == 200
    filtered = client.get(
        "/api/v1/audit?q=auth.login_succeeded&sort_by=action&sort_order=asc",
        headers={"Authorization": f"Bearer {admin['access_token']}"},
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] > 0
    assert all("auth.login_succeeded" in event["action"] for event in filtered.json()["items"])

    for email, password in [
        (OPERATOR_EMAIL, OPERATOR_PASSWORD),
        (VIEWER_EMAIL, VIEWER_PASSWORD),
    ]:
        user = login(client, email, password)
        response = client.get(
            "/api/v1/audit",
            headers={"Authorization": f"Bearer {user['access_token']}"},
        )
        assert response.status_code == 403
