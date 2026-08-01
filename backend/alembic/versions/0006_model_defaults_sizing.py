"""task model defaults sizing columns

Revision ID: 0006_model_defaults_sizing
Revises: 0005_model_defaults
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_model_defaults_sizing"
down_revision: str | None = "0005_model_defaults"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("task_model_defaults", sa.Column("latency_sec", sa.Float(), nullable=True))
    op.add_column("task_model_defaults", sa.Column("silicon", sa.String(length=60), nullable=True))
    op.add_column("task_model_defaults", sa.Column("default_concurrency", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("task_model_defaults", "default_concurrency")
    op.drop_column("task_model_defaults", "silicon")
    op.drop_column("task_model_defaults", "latency_sec")
