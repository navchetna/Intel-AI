"""inference benchmarks and admin users

Revision ID: 0001_inference_benchmarks
Revises:
Create Date: 2026-06-30

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_inference_benchmarks"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "inference_benchmarks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("timestamp", sa.String(length=64), nullable=False),
        sa.Column("platform", sa.String(length=128), nullable=False),
        sa.Column("model", sa.String(length=256), nullable=False),
        sa.Column("dataset", sa.String(length=256), nullable=True),
        sa.Column("tp", sa.Integer(), nullable=True),
        sa.Column("num_deployments", sa.Integer(), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("concurrency", sa.Integer(), nullable=True),
        sa.Column("request_rate", sa.Float(), nullable=True),
        sa.Column("mean_ttft_ms", sa.Float(), nullable=True),
        sa.Column("median_ttft_ms", sa.Float(), nullable=True),
        sa.Column("p90_ttft_ms", sa.Float(), nullable=True),
        sa.Column("mean_tpot_ms", sa.Float(), nullable=True),
        sa.Column("median_tpot_ms", sa.Float(), nullable=True),
        sa.Column("p90_tpot_ms", sa.Float(), nullable=True),
        sa.Column("mean_itl_ms", sa.Float(), nullable=True),
        sa.Column("median_itl_ms", sa.Float(), nullable=True),
        sa.Column("p90_itl_ms", sa.Float(), nullable=True),
        sa.Column("request_throughput", sa.Float(), nullable=True),
        sa.Column("output_token_throughput", sa.Float(), nullable=True),
        sa.Column("interactivity_tokens_per_sec_per_user", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_inference_benchmarks_platform", "inference_benchmarks", ["platform"])
    op.create_index("ix_inference_benchmarks_model", "inference_benchmarks", ["model"])
    op.create_index(
        "ix_inference_benchmarks_input_tokens", "inference_benchmarks", ["input_tokens"]
    )
    op.create_index("ix_inference_benchmarks_concurrency", "inference_benchmarks", ["concurrency"])

    op.create_table(
        "benchmark_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=128), nullable=False),
        sa.Column("password_hash", sa.String(length=256), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("username", name="uq_benchmark_users_username"),
    )
    op.create_index("ix_benchmark_users_username", "benchmark_users", ["username"])


def downgrade() -> None:
    op.drop_index("ix_benchmark_users_username", table_name="benchmark_users")
    op.drop_table("benchmark_users")
    op.drop_index("ix_inference_benchmarks_concurrency", table_name="inference_benchmarks")
    op.drop_index("ix_inference_benchmarks_input_tokens", table_name="inference_benchmarks")
    op.drop_index("ix_inference_benchmarks_model", table_name="inference_benchmarks")
    op.drop_index("ix_inference_benchmarks_platform", table_name="inference_benchmarks")
    op.drop_table("inference_benchmarks")
