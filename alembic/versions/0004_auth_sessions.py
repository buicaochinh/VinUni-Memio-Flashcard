"""create auth_sessions for JWT refresh storage

Revision ID: 0004_auth_sess
Revises: 0003_dm_chat
Create Date: 2026-04-28

Session login inserts into auth_sessions; legacy DBs may lack this table.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_auth_sess"
down_revision = "0003_dm_chat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "auth_sessions" in insp.get_table_names():
        return

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(), nullable=False),
        sa.Column("device_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"], unique=False)
    op.create_index("ix_auth_sessions_revoked_at", "auth_sessions", ["revoked_at"], unique=False)


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS auth_sessions"))
