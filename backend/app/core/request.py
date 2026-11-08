from ipaddress import ip_address, ip_network

from fastapi import Request

from app.core.config import settings


def get_client_ip(request: Request) -> str | None:
    if request.client is None:
        return None

    peer = request.client.host
    if not _is_trusted_proxy(peer):
        return peer

    forwarded_for = request.headers.get("x-forwarded-for", "")
    candidate = peer
    for raw_address in reversed(forwarded_for.split(",")):
        try:
            address = str(ip_address(raw_address.strip()))
        except ValueError:
            break
        candidate = address
        if not _is_trusted_proxy(address):
            break
    return candidate


def _is_trusted_proxy(value: str) -> bool:
    try:
        address = ip_address(value)
    except ValueError:
        return False

    for configured_network in settings.trusted_proxy_ips_list:
        try:
            if address in ip_network(configured_network, strict=False):
                return True
        except ValueError:
            continue
    return False
