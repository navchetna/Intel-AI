"""task model defaults request-volume sizing columns

Revision ID: 0007_model_defaults_req_sizing
Revises: 0006_model_defaults_sizing
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_model_defaults_req_sizing"
down_revision: str | None = "0006_model_defaults_sizing"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("task_model_defaults", sa.Column("requests_per_day", sa.Float(), nullable=True))
    op.add_column("task_model_defaults", sa.Column("processing_window_hrs", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("task_model_defaults", "processing_window_hrs")
    op.drop_column("task_model_defaults", "requests_per_day")
