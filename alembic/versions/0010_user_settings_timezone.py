"""add user settings timezone

Revision ID: 0010_user_settings_timezone
Revises: 0009_ingestion_card_maps
Create Date: 2026-05-06

"""

from alembic import op
import sqlalchemy as sa


revision = "0010_user_settings_timezone"
down_revision = "0009_ingestion_card_maps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("timezone", sa.String(), server_default="Asia/Ho_Chi_Minh", nullable=False),
    )
    op.alter_column("user_settings", "timezone", server_default=None)


def downgrade() -> None:
    op.drop_column("user_settings", "timezone")
