"""add coach threads and messages

Revision ID: 0012_coach_threads
Revises: 0011_game_sessions
Create Date: 2026-05-07
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0012_coach_threads"
down_revision = "0011_game_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "coach_threads" not in tables:
        op.create_table(
            "coach_threads",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(), nullable=False, server_default="Memio Coach"),
            sa.Column("context_deck_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["context_deck_id"], ["decks.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_coach_threads_user_id", "coach_threads", ["user_id"])
        op.create_index("ix_coach_threads_context_deck_id", "coach_threads", ["context_deck_id"])
        op.create_index("ix_coach_threads_user_updated", "coach_threads", ["user_id", "updated_at"])

    if "coach_messages" not in tables:
        op.create_table(
            "coach_messages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("thread_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("citations_json", sa.Text(), nullable=True),
            sa.Column("actions_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["thread_id"], ["coach_threads.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_coach_messages_thread_id", "coach_messages", ["thread_id"])
        op.create_index("ix_coach_messages_user_id", "coach_messages", ["user_id"])
        op.create_index("ix_coach_messages_thread_created", "coach_messages", ["thread_id", "created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "coach_messages" in tables:
        op.drop_index("ix_coach_messages_thread_created", table_name="coach_messages")
        op.drop_index("ix_coach_messages_user_id", table_name="coach_messages")
        op.drop_index("ix_coach_messages_thread_id", table_name="coach_messages")
        op.drop_table("coach_messages")
    if "coach_threads" in tables:
        op.drop_index("ix_coach_threads_user_updated", table_name="coach_threads")
        op.drop_index("ix_coach_threads_context_deck_id", table_name="coach_threads")
        op.drop_index("ix_coach_threads_user_id", table_name="coach_threads")
        op.drop_table("coach_threads")
