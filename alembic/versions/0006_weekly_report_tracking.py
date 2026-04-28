"""add weekly report tracking columns to chat_integrations

Revision ID: 0006_weekly_report
Revises: 0005_integ_counters
Create Date: 2026-04-28
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006_weekly_report"
down_revision = "0005_integ_counters"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "chat_integrations" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("chat_integrations")}
    if "weekly_report_week" not in cols:
        op.add_column("chat_integrations", sa.Column("weekly_report_week", sa.String(), nullable=True))
    if "weekly_report_sent_at" not in cols:
        op.add_column("chat_integrations", sa.Column("weekly_report_sent_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "chat_integrations" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("chat_integrations")}
    if "weekly_report_sent_at" in cols:
        op.drop_column("chat_integrations", "weekly_report_sent_at")
    if "weekly_report_week" in cols:
        op.drop_column("chat_integrations", "weekly_report_week")

