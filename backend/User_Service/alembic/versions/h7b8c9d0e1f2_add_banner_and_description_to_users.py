"""add banner_url and description to users

Revision ID: h7b8c9d0e1f2
Revises: a1b2c3d4e5f6
Create Date: 2026-06-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "h7b8c9d0e1f2"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("banner_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("description", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "description")
    op.drop_column("users", "banner_url")
