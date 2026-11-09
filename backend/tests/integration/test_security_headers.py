import base64
import hashlib
import re

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
    assert response.json() == {
        "type": "about:blank",
        "title": "Error interno del servidor",
        "status": 500,
        "detail": "Error interno del servidor.",
        "instance": "/__test_boom",
    }
    assert "database password leaked" not in response.text
    assert response.headers["x-content-type-options"] == "nosniff"


def test_openapi_documents_problem_details_response_media_type():
    response_schema = app.openapi()["paths"]["/api/v1/users"]["get"]["responses"]["422"]

    assert "application/problem+json" in response_schema["content"]
    assert "application/json" not in response_schema["content"]


def test_api_docs_are_available_in_production_without_bypassing_auth(
    client: TestClient,
    monkeypatch,
):
    monkeypatch.setattr(settings, "environment", "production")

    docs_response = client.get("/docs")
    openapi_response = client.get("/openapi.json")
    redoc_response = client.get("/redoc")

    assert docs_response.status_code == 200
    assert openapi_response.status_code == 200
    assert redoc_response.status_code == 200

    swagger_script = re.search(
        r"<script>(.*?)</script>", docs_response.text, re.DOTALL
    )
    assert swagger_script is not None
    script_hash = base64.b64encode(
        hashlib.sha256(swagger_script.group(1).encode("utf-8")).digest()
    ).decode("ascii")
    script_policy = next(
        directive
        for directive in docs_response.headers["content-security-policy"].split(";")
        if directive.strip().startswith("script-src ")
    )
    assert f"'sha256-{script_hash}'" in script_policy
    assert "'unsafe-inline'" not in script_policy

    schema = openapi_response.json()
    assert "/api/v1/users" in schema["paths"]
    assert "/api/v1/vehicles" in schema["paths"]
    assert schema["paths"]["/api/v1/users"]["get"]["security"]
    assert "WIALON_TOKEN" not in openapi_response.text
    assert "ADMIN_PASSWORD" not in openapi_response.text

    assert client.get("/api/v1/users").status_code == 401
    assert client.get("/api/v1/vehicles").status_code == 401
