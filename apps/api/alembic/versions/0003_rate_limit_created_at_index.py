"""Index rate_limit_events.created_at for the window cleanup delete.

Revision ID: 0003
Revises: 0002
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_rate_limit_created_at", "rate_limit_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_rate_limit_created_at", table_name="rate_limit_events")
