"""add oauth connections for notion

Revision ID: 0008_notion_oauth
Revises: 0008
Create Date: 2026-05-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008_notion_oauth"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "oauth_connections" not in tables:
        op.create_table(
            "oauth_connections",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(), nullable=False),
            sa.Column("provider_user_id", sa.String(), nullable=True),
            sa.Column("access_token", sa.Text(), nullable=False),
            sa.Column("workspace_id", sa.String(), nullable=True),
            sa.Column("workspace_name", sa.String(), nullable=True),
            sa.Column("workspace_icon", sa.String(), nullable=True),
            sa.Column("owner_type", sa.String(), nullable=True),
            sa.Column("capabilities_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "provider", name="uq_oauth_connections_user_provider"),
        )
        op.create_index("ix_oauth_connections_user_id", "oauth_connections", ["user_id"])
        op.create_index("ix_oauth_connections_provider", "oauth_connections", ["provider"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "oauth_connections" in tables:
        op.drop_index("ix_oauth_connections_provider", table_name="oauth_connections")
        op.drop_index("ix_oauth_connections_user_id", table_name="oauth_connections")
        op.drop_table("oauth_connections")
