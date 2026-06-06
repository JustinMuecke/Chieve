"""guides: replace content column with s3_key

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-06-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "e4f5a6b7c8d9"
down_revision = "d3e4f5a6b7c8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("guides", "content")
    op.add_column("guides", sa.Column("s3_key", sa.String(500), nullable=False, server_default=""))
    op.alter_column("guides", "s3_key", server_default=None)


def downgrade() -> None:
    op.drop_column("guides", "s3_key")
    op.add_column("guides", sa.Column("content", sa.Text, nullable=False, server_default=""))
    op.alter_column("guides", "content", server_default=None)
