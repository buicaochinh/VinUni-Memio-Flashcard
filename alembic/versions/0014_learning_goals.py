"""add learning goals

Revision ID: 0014_learning_goals
Revises: 0013_add_image_fields
Create Date: 2026-05-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0014_learning_goals"
down_revision = "0013_add_image_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "learning_goals" not in tables:
        op.create_table(
            "learning_goals",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("deck_id", sa.Integer(), nullable=False),
            sa.Column("goal_type", sa.String(), nullable=False, server_default="exam"),
            sa.Column("target_date", sa.String(), nullable=False),
            sa.Column("desired_mastery", sa.Integer(), nullable=False, server_default="85"),
            sa.Column("daily_workload", sa.Integer(), nullable=False, server_default="20"),
            sa.Column("status", sa.String(), nullable=False, server_default="active"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["deck_id"], ["decks.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "deck_id", name="uq_learning_goals_user_deck"),
        )
        op.create_index("ix_learning_goals_user_id", "learning_goals", ["user_id"])
        op.create_index("ix_learning_goals_deck_id", "learning_goals", ["deck_id"])
        op.create_index("ix_learning_goals_user_target", "learning_goals", ["user_id", "target_date"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "learning_goals" in tables:
        op.drop_index("ix_learning_goals_user_target", table_name="learning_goals")
        op.drop_index("ix_learning_goals_deck_id", table_name="learning_goals")
        op.drop_index("ix_learning_goals_user_id", table_name="learning_goals")
        op.drop_table("learning_goals")
