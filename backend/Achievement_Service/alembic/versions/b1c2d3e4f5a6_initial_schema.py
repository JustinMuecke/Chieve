"""initial schema: games, achievements, user_achievements, user_profile_stats,
user_milestones, mv_community_points

Revision ID: b1c2d3e4f5a6
Revises:
Create Date: 2026-06-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "b1c2d3e4f5a6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "games",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_app_id", sa.Integer(), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("header_image_url", sa.String(500)),
    )

    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("game_id", sa.Integer(), sa.ForeignKey("games.id", ondelete="CASCADE"), nullable=False),
        sa.Column("api_name", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255)),
        sa.Column("description", sa.Text()),
        sa.Column("icon_url", sa.String(500)),
        sa.Column("global_unlock_percent", sa.Numeric(5, 2)),
        sa.Column("global_points", sa.Integer(), server_default="10", nullable=False),
        sa.UniqueConstraint("game_id", "api_name"),
    )
    op.create_index("ix_achievements_game_id", "achievements", ["game_id"])

    op.create_table(
        "user_achievements",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "achievement_id",
            sa.Integer(),
            sa.ForeignKey("achievements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("unlocked_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("user_id", "achievement_id"),
    )
    op.create_index("ix_user_achievements_user_id", "user_achievements", ["user_id"])

    op.create_table(
        "user_profile_stats",
        sa.Column("user_id", sa.Integer(), primary_key=True),
        sa.Column("total_achievements", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_global_points", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_community_points", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "user_milestones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("milestone_type", sa.String(50), nullable=False),
        sa.Column("game_id", sa.Integer(), sa.ForeignKey("games.id", ondelete="CASCADE")),
        sa.Column(
            "achievement_id",
            sa.Integer(),
            sa.ForeignKey("achievements.id", ondelete="SET NULL"),
        ),
        sa.Column("achieved_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_milestones_user_id", "user_milestones", ["user_id"])
    op.create_index(
        "ix_user_milestones_user_type_game",
        "user_milestones",
        ["user_id", "milestone_type", "game_id"],
    )

    # Materialized view for community points (refreshed daily by Celery)
    op.execute("""
        CREATE MATERIALIZED VIEW mv_community_points AS
        WITH total_users AS (
            SELECT GREATEST(COUNT(*), 1)::numeric AS cnt
            FROM user_profile_stats
        )
        SELECT
            ua.achievement_id,
            GREATEST(10, ROUND(
                100 - (COUNT(ua.user_id)::numeric / (SELECT cnt FROM total_users) * 100)
            ))::int AS community_points
        FROM user_achievements ua
        GROUP BY ua.achievement_id
    """)
    op.execute("""
        CREATE UNIQUE INDEX ix_mv_community_points_achievement_id
        ON mv_community_points (achievement_id)
    """)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_community_points")
    op.drop_table("user_milestones")
    op.drop_table("user_profile_stats")
    op.drop_table("user_achievements")
    op.drop_table("achievements")
    op.drop_table("games")
