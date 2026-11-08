"""add shared login rate-limit buckets

Revision ID: 89d52c91f4ad
Revises: de6328ebb176
Create Date: 2026-11-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "89d52c91f4ad"
down_revision: Union[str, Sequence[str], None] = "de6328ebb176"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "login_rate_limits",
        sa.Column("key_digest", sa.String(length=64), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("key_digest"),
    )
    op.create_index(
        "ix_login_rate_limits_window_started_at",
        "login_rate_limits",
        ["window_started_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_login_rate_limits_window_started_at", table_name="login_rate_limits")
    op.drop_table("login_rate_limits")
