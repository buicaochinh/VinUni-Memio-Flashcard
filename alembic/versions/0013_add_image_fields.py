"""add image fields to flashcards

Revision ID: 0013_add_image_fields
Revises: 0012_coach_threads
Create Date: 2026-05-08
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0013_add_image_fields"
down_revision = "0012_coach_threads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_cols = {col["name"] for col in insp.get_columns("flashcards")}

    if "image_type" not in existing_cols:
        op.add_column("flashcards",
            sa.Column("image_type", sa.String(), nullable=True))

    if "image_url" not in existing_cols:
        op.add_column("flashcards",
            sa.Column("image_url", sa.String(), nullable=True))

    if "diagram_spec" not in existing_cols:
        op.add_column("flashcards",
            sa.Column("diagram_spec", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_cols = {col["name"] for col in insp.get_columns("flashcards")}

    if "diagram_spec" in existing_cols:
        op.drop_column("flashcards", "diagram_spec")

    if "image_url" in existing_cols:
        op.drop_column("flashcards", "image_url")

    if "image_type" in existing_cols:
        op.drop_column("flashcards", "image_type")
