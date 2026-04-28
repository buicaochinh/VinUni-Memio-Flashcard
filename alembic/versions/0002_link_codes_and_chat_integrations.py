"""add link_codes and chat_integrations if missing

Revision ID: 0002_integ
Revises: 0001_baseline
Create Date: 2026-04-28

Production DBs stamped at baseline may lack tables added after the legacy
schema; Telegram /start inserts into link_codes.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_integ"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing = set(insp.get_table_names())

    if "link_codes" not in existing:
        op.create_table(
            "link_codes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, primary_key=True),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("provider", sa.String(), nullable=False),
            sa.Column("provider_user_id", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("consumed_at", sa.DateTime(), nullable=True),
            sa.Column("consumed_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["consumed_by_user_id"], ["users.id"]),
            sa.UniqueConstraint("code", name="unique_link_code"),
        )
        op.create_index("ix_link_codes_code", "link_codes", ["code"], unique=False)
        op.create_index("ix_link_codes_expires_at", "link_codes", ["expires_at"], unique=False)

    if "chat_integrations" not in existing:
        op.create_table(
            "chat_integrations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(), nullable=False),
            sa.Column("provider_user_id", sa.String(), nullable=False),
            sa.Column("dm_chat_id", sa.String(), nullable=True),
            sa.Column("group_target_id", sa.String(), nullable=True),
            sa.Column("timezone", sa.String(), nullable=False),
            sa.Column("send_window", sa.String(), nullable=False),
            sa.Column("daily_goal", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("last_sent_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.UniqueConstraint("provider", "provider_user_id", name="unique_provider_user"),
            sa.UniqueConstraint("user_id", "provider", name="unique_user_provider"),
        )
        op.create_index(
            "ix_chat_integrations_user_id",
            "chat_integrations",
            ["user_id"],
            unique=False,
        )


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS link_codes"))
    # Intentionally not dropping chat_integrations (may pre-exist on some DBs).
