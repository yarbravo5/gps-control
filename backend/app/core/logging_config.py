import json
import logging
from datetime import datetime, timezone


class JsonLogFormatter(logging.Formatter):
    """Emit one JSON object per event without serializing request or secret data."""

    def format(self, record: logging.LogRecord) -> str:
        event: dict[str, str] = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            exception_type = record.exc_info[0]
            if exception_type is not None:
                event["exception_type"] = exception_type.__name__
        return json.dumps(event, ensure_ascii=False)


def configure_logging() -> None:
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonLogFormatter())
        root_logger.addHandler(handler)
    else:
        for handler in root_logger.handlers:
            handler.setFormatter(JsonLogFormatter())
    root_logger.setLevel(logging.INFO)
