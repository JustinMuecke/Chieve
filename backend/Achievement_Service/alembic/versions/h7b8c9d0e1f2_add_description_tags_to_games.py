"""add description and tags to games

Revision ID: h7b8c9d0e1f2
Revises: g6a7b8c9d0e1
Create Date: 2026-06-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "h7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "g6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("games", sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True))


def downgrade() -> None:
    op.drop_column("games", "tags")
    op.drop_column("games", "description")
