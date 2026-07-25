"""add serving_engine to inference_benchmarks

Revision ID: 0002_serving_engine
Revises: 0001_inference_benchmarks
Create Date: 2026-07-17

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_serving_engine"
down_revision: str | None = "0001_inference_benchmarks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inference_benchmarks", sa.Column("serving_engine", sa.String(length=64), nullable=True)
    )
    op.create_index(
        "ix_inference_benchmarks_serving_engine", "inference_benchmarks", ["serving_engine"]
    )


def downgrade() -> None:
    op.drop_index("ix_inference_benchmarks_serving_engine", table_name="inference_benchmarks")
    op.drop_column("inference_benchmarks", "serving_engine")
