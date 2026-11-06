import threading
from collections.abc import Callable
from typing import TypeVar

from app.gateways.wialon.exceptions import WialonApiError, WialonSessionError


T = TypeVar("T")


class WialonSession:
    """Keeps the Wialon session identifier in process memory and retries once."""

    INVALID_SESSION_CODE = 1

    def __init__(self) -> None:
        self._sid: str | None = None
        self._lock = threading.RLock()

    def execute(self, request: Callable[[str], T], login: Callable[[], str]) -> T:
        with self._lock:
            sid = self._sid or login()
            self._sid = sid
            try:
                return request(sid)
            except WialonApiError as exc:
                if exc.code != self.INVALID_SESSION_CODE:
                    raise

            self._sid = None
            sid = login()
            self._sid = sid
            try:
                return request(sid)
            except WialonApiError as exc:
                if exc.code != self.INVALID_SESSION_CODE:
                    raise
                self._sid = None
                raise WialonSessionError(
                    "La sesión del servicio de telemetría expiró."
                ) from exc
