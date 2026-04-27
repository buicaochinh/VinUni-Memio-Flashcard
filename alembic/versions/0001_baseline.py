"""baseline (initial schema)

Revision ID: 0001_baseline
Revises: 
Create Date: 2026-04-27

"""

from alembic import op
import sqlalchemy as sa


revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # We keep the baseline migration empty on purpose.
    #
    # Rationale:
    # - This repo already has a live PostgreSQL database with tables created historically.
    # - Generating full CREATE TABLE statements risks drift and accidental destructive changes.
    # - For existing DBs: run `alembic stamp head`.
    # - For brand new DBs: use `alembic revision --autogenerate` from an empty DB
    #   or add a dedicated create-tables migration after confirming schema.
    pass


def downgrade() -> None:
    pass

