"""project notes and discussion messages

Revision ID: 0010_project_notes_discussions
Revises: 0009_category
Create Date: 2026-08-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0010_project_notes_discussions"
down_revision: str | None = "0009_category"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body", sa.String(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_project_notes_project_id", "project_notes", ["project_id"])

    op.create_table(
        "project_discussion_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("author", sa.String(length=150), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_project_discussion_messages_project_id", "project_discussion_messages", ["project_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_project_discussion_messages_project_id", table_name="project_discussion_messages")
    op.drop_table("project_discussion_messages")
    op.drop_index("ix_project_notes_project_id", table_name="project_notes")
    op.drop_table("project_notes")
