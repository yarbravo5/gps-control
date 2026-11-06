class WialonIntegrationError(Exception):
    """Base exception for sanitized Wialon integration failures."""


class WialonConnectionError(WialonIntegrationError):
    pass


class WialonAuthenticationError(WialonIntegrationError):
    pass


class WialonSessionError(WialonIntegrationError):
    pass


class WialonApiError(WialonIntegrationError):
    def __init__(self, code: int) -> None:
        self.code = code
        super().__init__(f"Wialon rechazó la operación (código {code}).")
