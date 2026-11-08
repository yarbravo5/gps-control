from fastapi.testclient import TestClient


def test_version_endpoint_exposes_only_render_git_metadata(
    client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.setenv("RENDER_GIT_COMMIT", "a01f383057a7334ca920e2b152e9fd912a6f4e1f")
    monkeypatch.setenv("RENDER_GIT_BRANCH", "main")

    response = client.get("/version")

    assert response.status_code == 200
    assert response.json() == {
        "commit": "a01f383057a7334ca920e2b152e9fd912a6f4e1f",
        "branch": "main",
    }
    assert "token" not in response.text.lower()
    assert "secret" not in response.text.lower()


def test_version_endpoint_returns_null_metadata_outside_render(
    client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.delenv("RENDER_GIT_BRANCH", raising=False)

    response = client.get("/version")

    assert response.status_code == 200
    assert response.json() == {"commit": None, "branch": None}
