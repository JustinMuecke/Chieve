"""guides: add description and header_image_s3_key

Revision ID: g6a7b8c9d0e1
Revises: f5a6b7c8d9e0
Create Date: 2026-06-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "g6a7b8c9d0e1"
down_revision = "f5a6b7c8d9e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("guides", sa.Column("description", sa.String(500), nullable=True))
    op.add_column("guides", sa.Column("header_image_s3_key", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("guides", "header_image_s3_key")
    op.drop_column("guides", "description")
