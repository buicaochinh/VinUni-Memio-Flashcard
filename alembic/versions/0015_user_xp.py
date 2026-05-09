"""add total_xp to users

Revision ID: 0015_user_xp
Revises: 0014_learning_goals
Create Date: 2026-05-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0015_user_xp"
down_revision = "0014_learning_goals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = {c["name"] for c in insp.get_columns("users")}

    if "total_xp" not in columns:
        op.add_column("users", sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("users", "total_xp")
