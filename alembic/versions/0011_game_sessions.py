"""add game sessions

Revision ID: 0011_game_sessions
Revises: 0010_user_settings_timezone
Create Date: 2026-05-07
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0011_game_sessions"
down_revision = "0010_user_settings_timezone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "game_sessions" not in tables:
        op.create_table(
            "game_sessions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("deck_id", sa.Integer(), nullable=False),
            sa.Column("mode", sa.String(), nullable=False, server_default="adventure_campaign"),
            sa.Column("status", sa.String(), nullable=False, server_default="started"),
            sa.Column("campaign_json", sa.Text(), nullable=False),
            sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("xp_earned", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("accuracy", sa.Float(), nullable=False, server_default="0"),
            sa.Column("total_questions", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("correct_answers", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("started_at", sa.DateTime(), nullable=False),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["deck_id"], ["decks.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_game_sessions_user_id", "game_sessions", ["user_id"])
        op.create_index("ix_game_sessions_deck_id", "game_sessions", ["deck_id"])
        op.create_index("ix_game_sessions_user_deck", "game_sessions", ["user_id", "deck_id"])
        op.create_index("ix_game_sessions_created_at", "game_sessions", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "game_sessions" in tables:
        op.drop_index("ix_game_sessions_created_at", table_name="game_sessions")
        op.drop_index("ix_game_sessions_user_deck", table_name="game_sessions")
        op.drop_index("ix_game_sessions_deck_id", table_name="game_sessions")
        op.drop_index("ix_game_sessions_user_id", table_name="game_sessions")
        op.drop_table("game_sessions")
