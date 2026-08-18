"""add category to inference_benchmarks

Revision ID: 0009_category
Revises: 0008_app_settings
Create Date: 2026-08-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_category"
down_revision: str | None = "0008_app_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inference_benchmarks", sa.Column("category", sa.String(length=64), nullable=True)
    )
    op.create_index("ix_inference_benchmarks_category", "inference_benchmarks", ["category"])


def downgrade() -> None:
    op.drop_index("ix_inference_benchmarks_category", table_name="inference_benchmarks")
    op.drop_column("inference_benchmarks", "category")
