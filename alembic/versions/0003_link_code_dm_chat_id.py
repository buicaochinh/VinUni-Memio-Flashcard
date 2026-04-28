"""add link_codes.dm_chat_id for Telegram worker

Revision ID: 0003_dm_chat
Revises: 0002_integ
Create Date: 2026-04-28
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_dm_chat"
down_revision = "0002_integ"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "link_codes" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("link_codes")}
    if "dm_chat_id" not in cols:
        op.add_column("link_codes", sa.Column("dm_chat_id", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "link_codes" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("link_codes")}
    if "dm_chat_id" in cols:
        op.drop_column("link_codes", "dm_chat_id")
