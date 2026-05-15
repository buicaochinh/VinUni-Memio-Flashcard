"""add evaluation tracking tables

Revision ID: 0016_evaluation_tracking
Revises: 0015_user_xp
Create Date: 2026-05-15
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0016_evaluation_tracking"
down_revision = "0015_user_xp"
branch_labels = None
depends_on = None


def _columns(insp: sa.Inspector, table: str) -> set[str]:
    if table not in insp.get_table_names():
        return set()
    return {column["name"] for column in insp.get_columns(table)}


def _add_column_if_missing(insp: sa.Inspector, table: str, column: sa.Column) -> None:
    if column.name not in _columns(insp, table):
        op.add_column(table, column)


def _create_index_if_missing(insp: sa.Inspector, table: str, name: str, columns: list[str]) -> None:
    if table not in insp.get_table_names():
        return
    existing = {idx["name"] for idx in insp.get_indexes(table)}
    if name not in existing:
        op.create_index(name, table, columns)


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "flashcards" in tables:
        _add_column_if_missing(insp, "flashcards", sa.Column("origin", sa.String(), nullable=False, server_default="manual"))
        _add_column_if_missing(insp, "flashcards", sa.Column("generation_batch_id", sa.String(), nullable=True))
        _add_column_if_missing(insp, "flashcards", sa.Column("generation_item_id", sa.String(), nullable=True))
        _add_column_if_missing(insp, "flashcards", sa.Column("generated_front", sa.Text(), nullable=True))
        _add_column_if_missing(insp, "flashcards", sa.Column("generated_back", sa.Text(), nullable=True))
        _add_column_if_missing(insp, "flashcards", sa.Column("generated_difficulty", sa.String(), nullable=True))
        _add_column_if_missing(insp, "flashcards", sa.Column("accepted_at", sa.DateTime(), nullable=True))
        _add_column_if_missing(insp, "flashcards", sa.Column("first_edited_at", sa.DateTime(), nullable=True))
        _add_column_if_missing(insp, "flashcards", sa.Column("deleted_at", sa.DateTime(), nullable=True))
        _create_index_if_missing(insp, "flashcards", "ix_flashcards_origin", ["origin"])
        _create_index_if_missing(insp, "flashcards", "ix_flashcards_generation_batch_id", ["generation_batch_id"])
        _create_index_if_missing(insp, "flashcards", "ix_flashcards_generation_item_id", ["generation_item_id"])
        _create_index_if_missing(insp, "flashcards", "ix_flashcards_deleted_at", ["deleted_at"])

    if "review_history" not in tables:
        op.create_table(
            "review_history",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("card_id", sa.Integer(), nullable=False),
            sa.Column("deck_id", sa.Integer(), nullable=True),
            sa.Column("review_date", sa.String(), nullable=False),
            sa.Column("reviewed_at", sa.DateTime(), nullable=False),
            sa.Column("quality", sa.Integer(), nullable=False),
            sa.Column("previous_quality", sa.Integer(), nullable=True),
            sa.Column("ease_factor", sa.Float(), nullable=False),
            sa.Column("previous_ease_factor", sa.Float(), nullable=True),
            sa.Column("interval", sa.Integer(), nullable=False),
            sa.Column("previous_interval", sa.Integer(), nullable=True),
            sa.Column("repetition", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("previous_repetition", sa.Integer(), nullable=True),
            sa.Column("scheduled_review", sa.String(), nullable=True),
            sa.Column("days_since_last_review", sa.Integer(), nullable=True),
            sa.Column("review_source", sa.String(), nullable=False, server_default="study"),
            sa.Column("used_hint", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("is_correct", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("was_due", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("became_mastered", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("became_forgotten", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_review_history_user_id", "review_history", ["user_id"])
        op.create_index("ix_review_history_card_id", "review_history", ["card_id"])
        op.create_index("ix_review_history_deck_id", "review_history", ["deck_id"])
        op.create_index("ix_review_history_review_date", "review_history", ["review_date"])
        op.create_index("ix_review_history_review_source", "review_history", ["review_source"])
        op.create_index("ix_review_history_user_card", "review_history", ["user_id", "card_id"])
        op.create_index("ix_review_history_user_reviewed_at", "review_history", ["user_id", "reviewed_at"])
        op.create_index("ix_review_history_created_at", "review_history", ["created_at"])

    if "telemetry_events" not in tables:
        op.create_table(
            "telemetry_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("event_type", sa.String(), nullable=False),
            sa.Column("target_type", sa.String(), nullable=True),
            sa.Column("target_id", sa.String(), nullable=True),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_telemetry_events_user_id", "telemetry_events", ["user_id"])
        op.create_index("ix_telemetry_events_user_type", "telemetry_events", ["user_id", "event_type"])
        op.create_index("ix_telemetry_events_target", "telemetry_events", ["target_type", "target_id"])
        op.create_index("ix_telemetry_events_created_at", "telemetry_events", ["created_at"])

    if "ai_operation_logs" not in tables:
        op.create_table(
            "ai_operation_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("operation_type", sa.String(), nullable=False),
            sa.Column("endpoint", sa.String(), nullable=True),
            sa.Column("model", sa.String(), nullable=False),
            sa.Column("provider", sa.String(), nullable=False, server_default="openai"),
            sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("estimated_cost_usd", sa.Float(), nullable=False, server_default="0"),
            sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(), nullable=False, server_default="success"),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("request_count", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("output_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("accepted_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_ai_operation_logs_user_id", "ai_operation_logs", ["user_id"])
        op.create_index("ix_ai_operation_logs_endpoint", "ai_operation_logs", ["endpoint"])
        op.create_index("ix_ai_operation_logs_user_type", "ai_operation_logs", ["user_id", "operation_type"])
        op.create_index("ix_ai_operation_logs_status", "ai_operation_logs", ["operation_type", "status"])
        op.create_index("ix_ai_operation_logs_created_at", "ai_operation_logs", ["created_at"])

    if "goal_readiness_snapshots" not in tables:
        op.create_table(
            "goal_readiness_snapshots",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("goal_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("deck_id", sa.Integer(), nullable=False),
            sa.Column("target_date", sa.String(), nullable=False),
            sa.Column("desired_mastery", sa.Integer(), nullable=False),
            sa.Column("predicted_readiness", sa.Integer(), nullable=False),
            sa.Column("current_mastery", sa.Integer(), nullable=False),
            sa.Column("due_cards", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("new_cards", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("weak_cards", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("workload_cards", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("recommended_daily_cards", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("days_remaining", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("actual_mastery", sa.Integer(), nullable=True),
            sa.Column("prediction_error", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_goal_readiness_snapshots_goal_id", "goal_readiness_snapshots", ["goal_id"])
        op.create_index("ix_goal_readiness_snapshots_user_id", "goal_readiness_snapshots", ["user_id"])
        op.create_index("ix_goal_readiness_snapshots_deck_id", "goal_readiness_snapshots", ["deck_id"])
        op.create_index("ix_goal_readiness_goal_created", "goal_readiness_snapshots", ["goal_id", "created_at"])
        op.create_index("ix_goal_readiness_user_target", "goal_readiness_snapshots", ["user_id", "target_date"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "goal_readiness_snapshots" in tables:
        for name in (
            "ix_goal_readiness_user_target",
            "ix_goal_readiness_goal_created",
            "ix_goal_readiness_snapshots_deck_id",
            "ix_goal_readiness_snapshots_user_id",
            "ix_goal_readiness_snapshots_goal_id",
        ):
            if name in {idx["name"] for idx in insp.get_indexes("goal_readiness_snapshots")}:
                op.drop_index(name, table_name="goal_readiness_snapshots")
        op.drop_table("goal_readiness_snapshots")

    if "ai_operation_logs" in tables:
        for name in (
            "ix_ai_operation_logs_created_at",
            "ix_ai_operation_logs_status",
            "ix_ai_operation_logs_user_type",
            "ix_ai_operation_logs_endpoint",
            "ix_ai_operation_logs_user_id",
        ):
            if name in {idx["name"] for idx in insp.get_indexes("ai_operation_logs")}:
                op.drop_index(name, table_name="ai_operation_logs")
        op.drop_table("ai_operation_logs")

    if "telemetry_events" in tables:
        for name in (
            "ix_telemetry_events_created_at",
            "ix_telemetry_events_target",
            "ix_telemetry_events_user_type",
            "ix_telemetry_events_user_id",
        ):
            if name in {idx["name"] for idx in insp.get_indexes("telemetry_events")}:
                op.drop_index(name, table_name="telemetry_events")
        op.drop_table("telemetry_events")

    if "review_history" in tables:
        for name in (
            "ix_review_history_created_at",
            "ix_review_history_user_reviewed_at",
            "ix_review_history_user_card",
            "ix_review_history_review_source",
            "ix_review_history_review_date",
            "ix_review_history_deck_id",
            "ix_review_history_card_id",
            "ix_review_history_user_id",
        ):
            if name in {idx["name"] for idx in insp.get_indexes("review_history")}:
                op.drop_index(name, table_name="review_history")
        op.drop_table("review_history")

    if "flashcards" in tables:
        existing_indexes = {idx["name"] for idx in insp.get_indexes("flashcards")}
        for name in (
            "ix_flashcards_deleted_at",
            "ix_flashcards_generation_item_id",
            "ix_flashcards_generation_batch_id",
            "ix_flashcards_origin",
        ):
            if name in existing_indexes:
                op.drop_index(name, table_name="flashcards")
        cols = _columns(insp, "flashcards")
        for name in (
            "deleted_at",
            "first_edited_at",
            "accepted_at",
            "generated_difficulty",
            "generated_back",
            "generated_front",
            "generation_item_id",
            "generation_batch_id",
            "origin",
        ):
            if name in cols:
                op.drop_column("flashcards", name)
