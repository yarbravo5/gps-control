from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_api_responses_include_security_headers(client: TestClient):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["cross-origin-opener-policy"] == "same-origin"
    assert "default-src 'none'" in response.headers["content-security-policy"]


def test_hsts_is_only_sent_in_production(client: TestClient, monkeypatch):
    assert "strict-transport-security" not in client.get("/health").headers

    monkeypatch.setattr(settings, "environment", "production")
    response = client.get("/health")

    assert response.headers["strict-transport-security"] == (
        "max-age=31536000; includeSubDomains"
    )


def test_unhandled_errors_are_sanitized_and_keep_security_headers():
    def boom():
        raise RuntimeError("database password leaked")

    app.add_api_route("/__test_boom", boom, methods=["GET"])
    route = app.router.routes[-1]
    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            response = test_client.get("/__test_boom")
    finally:
        app.router.routes.remove(route)

    assert response.status_code == 500
    assert response.json() == {"detail": "Error interno del servidor."}
    assert "database password leaked" not in response.text
    assert response.headers["x-content-type-options"] == "nosniff"
