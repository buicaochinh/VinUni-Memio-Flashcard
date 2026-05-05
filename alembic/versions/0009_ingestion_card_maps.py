"""add ingestion item to flashcard map

Revision ID: 0009_ingestion_card_maps
Revises: 0008_notion_oauth
Create Date: 2026-05-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_ingestion_card_maps"
down_revision = "0008_notion_oauth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "ingestion_card_maps" not in tables:
        op.create_table(
            "ingestion_card_maps",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("ingestion_item_id", sa.Integer(), nullable=False),
            sa.Column("flashcard_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["flashcard_id"], ["flashcards.id"]),
            sa.ForeignKeyConstraint(["ingestion_item_id"], ["ingestion_items.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("ingestion_item_id", "flashcard_id", name="uq_ingestion_card_maps_item_card"),
        )
        op.create_index("ix_ingestion_card_maps_item", "ingestion_card_maps", ["ingestion_item_id"])
        op.create_index("ix_ingestion_card_maps_flashcard_id", "ingestion_card_maps", ["flashcard_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "ingestion_card_maps" in tables:
        op.drop_index("ix_ingestion_card_maps_flashcard_id", table_name="ingestion_card_maps")
        op.drop_index("ix_ingestion_card_maps_item", table_name="ingestion_card_maps")
        op.drop_table("ingestion_card_maps")
