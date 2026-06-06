"""add guide_favorites table

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-06-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "f5a6b7c8d9e0"
down_revision = "e4f5a6b7c8d9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "guide_favorites",
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("guide_id", sa.Integer, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["guide_id"], ["guides.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "guide_id"),
    )


def downgrade() -> None:
    op.drop_table("guide_favorites")
