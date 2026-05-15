"""add is_admin to users

Revision ID: 0017_user_is_admin
Revises: 0016_evaluation_tracking
Create Date: 2026-05-15
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0017_user_is_admin"
down_revision = "0016_evaluation_tracking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "users" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("users")}
    if "is_admin" not in cols:
        op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))

    indexes = {idx["name"] for idx in insp.get_indexes("users")}
    if "ix_users_is_admin" not in indexes:
        op.create_index("ix_users_is_admin", "users", ["is_admin"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "users" not in insp.get_table_names():
        return

    indexes = {idx["name"] for idx in insp.get_indexes("users")}
    if "ix_users_is_admin" in indexes:
        op.drop_index("ix_users_is_admin", table_name="users")

    cols = {c["name"] for c in insp.get_columns("users")}
    if "is_admin" in cols:
        op.drop_column("users", "is_admin")
