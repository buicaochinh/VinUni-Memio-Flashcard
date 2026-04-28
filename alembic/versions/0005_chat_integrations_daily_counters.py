"""add chat_integrations daily counters for worker

Revision ID: 0005_integ_counters
Revises: 0004_auth_sess
Create Date: 2026-04-28
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_integ_counters"
down_revision = "0004_auth_sess"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "chat_integrations" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("chat_integrations")}
    if "sent_today" not in cols:
        op.add_column("chat_integrations", sa.Column("sent_today", sa.Integer(), nullable=False, server_default="0"))
    if "sent_today_date" not in cols:
        op.add_column("chat_integrations", sa.Column("sent_today_date", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "chat_integrations" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("chat_integrations")}
    if "sent_today_date" in cols:
        op.drop_column("chat_integrations", "sent_today_date")
    if "sent_today" in cols:
        op.drop_column("chat_integrations", "sent_today")

