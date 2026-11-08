from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import DatabaseBase


class LoginRateLimit(DatabaseBase):
    __tablename__ = "login_rate_limits"
    __table_args__ = (Index("ix_login_rate_limits_window_started_at", "window_started_at"),)

    key_digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    window_started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    request_count: Mapped[int] = mapped_column(Integer, nullable=False)
