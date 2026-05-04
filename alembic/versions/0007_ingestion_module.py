"""add ingestion module tables

Revision ID: 0007_ingestion_module
Revises: 0006_weekly_report
Create Date: 2026-05-02
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0007_ingestion_module"
down_revision = "0006_weekly_report"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "ingestion_sources" not in tables:
        op.create_table(
            "ingestion_sources",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("sync_mode", sa.String(), nullable=False),
            sa.Column("source_url", sa.String(), nullable=True),
            sa.Column("external_id", sa.String(), nullable=True),
            sa.Column("target_deck_id", sa.Integer(), nullable=True),
            sa.Column("auto_tag", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("frequency_minutes", sa.Integer(), nullable=False, server_default="360"),
            sa.Column("cards_per_item", sa.Integer(), nullable=False, server_default="6"),
            sa.Column("config_json", sa.Text(), nullable=True),
            sa.Column("last_synced_at", sa.DateTime(), nullable=True),
            sa.Column("last_error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["target_deck_id"], ["decks.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_ingestion_sources_user_id", "ingestion_sources", ["user_id"])
        op.create_index("ix_ingestion_sources_user_provider", "ingestion_sources", ["user_id", "provider"])

    if "ingestion_items" not in tables:
        op.create_table(
            "ingestion_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("external_id", sa.String(), nullable=True),
            sa.Column("external_url", sa.String(), nullable=True),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("content_text", sa.Text(), nullable=True),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("topic_tag", sa.String(), nullable=True),
            sa.Column("checksum", sa.String(), nullable=False),
            sa.Column("published_at", sa.DateTime(), nullable=True),
            sa.Column("last_processed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["source_id"], ["ingestion_sources.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("source_id", "checksum", name="uq_ingestion_items_source_checksum"),
        )
        op.create_index("ix_ingestion_items_checksum", "ingestion_items", ["checksum"])
        op.create_index("ix_ingestion_items_source_id", "ingestion_items", ["source_id"])
        op.create_index("ix_ingestion_items_source_created", "ingestion_items", ["source_id", "created_at"])

    if "ingestion_runs" not in tables:
        op.create_table(
            "ingestion_runs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("started_at", sa.DateTime(), nullable=False),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("fetched_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("normalized_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["source_id"], ["ingestion_sources.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_ingestion_runs_source_id", "ingestion_runs", ["source_id"])
        op.create_index("ix_ingestion_runs_source_started", "ingestion_runs", ["source_id", "started_at"])

    if "external_notes" not in tables:
        op.create_table(
            "external_notes",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("external_note_id", sa.String(), nullable=False),
            sa.Column("parent_external_id", sa.String(), nullable=True),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("note_type", sa.String(), nullable=False),
            sa.Column("content_text", sa.Text(), nullable=True),
            sa.Column("highlights_text", sa.Text(), nullable=True),
            sa.Column("graph_refs_json", sa.Text(), nullable=True),
            sa.Column("last_seen_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["source_id"], ["ingestion_sources.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("source_id", "external_note_id", name="uq_external_notes_source_note"),
        )
        op.create_index("ix_external_notes_source_id", "external_notes", ["source_id"])
        op.create_index("ix_external_notes_source_last_seen", "external_notes", ["source_id", "last_seen_at"])

    if "ingestion_cursors" not in tables:
        op.create_table(
            "ingestion_cursors",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("cursor_type", sa.String(), nullable=False),
            sa.Column("cursor_value", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["source_id"], ["ingestion_sources.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("source_id", name="uq_ingestion_cursors_source"),
        )
        op.create_index("ix_ingestion_cursors_source_id", "ingestion_cursors", ["source_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "ingestion_cursors" in tables:
        op.drop_index("ix_ingestion_cursors_source_id", table_name="ingestion_cursors")
        op.drop_table("ingestion_cursors")
    if "external_notes" in tables:
        op.drop_index("ix_external_notes_source_last_seen", table_name="external_notes")
        op.drop_index("ix_external_notes_source_id", table_name="external_notes")
        op.drop_table("external_notes")
    if "ingestion_runs" in tables:
        op.drop_index("ix_ingestion_runs_source_started", table_name="ingestion_runs")
        op.drop_index("ix_ingestion_runs_source_id", table_name="ingestion_runs")
        op.drop_table("ingestion_runs")
    if "ingestion_items" in tables:
        op.drop_index("ix_ingestion_items_source_created", table_name="ingestion_items")
        op.drop_index("ix_ingestion_items_source_id", table_name="ingestion_items")
        op.drop_index("ix_ingestion_items_checksum", table_name="ingestion_items")
        op.drop_table("ingestion_items")
    if "ingestion_sources" in tables:
        op.drop_index("ix_ingestion_sources_user_provider", table_name="ingestion_sources")
        op.drop_index("ix_ingestion_sources_user_id", table_name="ingestion_sources")
        op.drop_table("ingestion_sources")
