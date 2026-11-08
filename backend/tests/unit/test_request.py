from starlette.requests import Request

from app.core.config import settings
from app.core.request import get_client_ip


def make_request(peer_ip: str, forwarded_for: str) -> Request:
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "https",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": [(b"x-forwarded-for", forwarded_for.encode())],
            "client": (peer_ip, 443),
            "server": ("example.test", 443),
        }
    )


def test_untrusted_peer_cannot_override_client_ip(monkeypatch) -> None:
    monkeypatch.setattr(settings, "trusted_proxy_ips", "10.0.0.0/8")
    request = make_request("198.51.100.12", "203.0.113.99")

    assert get_client_ip(request) == "198.51.100.12"


def test_trusted_proxy_chain_uses_first_untrusted_address(monkeypatch) -> None:
    monkeypatch.setattr(settings, "trusted_proxy_ips", "10.0.0.0/8")
    request = make_request(
        "10.0.0.5",
        "203.0.113.99, 198.51.100.20, 10.0.0.4",
    )

    assert get_client_ip(request) == "198.51.100.20"


def test_forwarded_header_is_ignored_when_no_proxy_is_trusted(monkeypatch) -> None:
    monkeypatch.setattr(settings, "trusted_proxy_ips", "")
    request = make_request("10.0.0.5", "198.51.100.20")

    assert get_client_ip(request) == "10.0.0.5"
