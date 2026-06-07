"""initial schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "game_embeddings",
        sa.Column("app_id", sa.BigInteger(), primary_key=True),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "recommendation_dismissals",
        sa.Column("user_id", sa.BigInteger(), primary_key=True),
        sa.Column("app_id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "dismissed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "wishlist",
        sa.Column("user_id", sa.BigInteger(), primary_key=True),
        sa.Column("app_id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "added_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index("ix_wishlist_user_id", "wishlist", ["user_id"])
    op.create_index("ix_dismissals_user_id", "recommendation_dismissals", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_dismissals_user_id")
    op.drop_index("ix_wishlist_user_id")
    op.drop_table("wishlist")
    op.drop_table("recommendation_dismissals")
    op.drop_table("game_embeddings")
