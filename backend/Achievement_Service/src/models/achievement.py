from datetime import datetime
from sqlalchemy import ARRAY, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_app_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    header_image_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    global_stats_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    achievements: Mapped[list["Achievement"]] = relationship(
        back_populates="game", cascade="all, delete-orphan"
    )


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    api_name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String)
    icon_url: Mapped[str | None] = mapped_column(String(500))
    global_unlock_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    global_points: Mapped[int] = mapped_column(Integer, default=10)

    game: Mapped["Game"] = relationship(back_populates="achievements")
    user_achievements: Mapped[list["UserAchievement"]] = relationship(
        back_populates="achievement", cascade="all, delete-orphan"
    )


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    achievement_id: Mapped[int] = mapped_column(
        ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True
    )
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    achievement: Mapped["Achievement"] = relationship(back_populates="user_achievements")


class UserProfileStats(Base):
    __tablename__ = "user_profile_stats"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    total_achievements: Mapped[int] = mapped_column(Integer, default=0)
    total_global_points: Mapped[int] = mapped_column(Integer, default=0)
    total_community_points: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserMilestone(Base):
    __tablename__ = "user_milestones"
    __table_args__ = (
        Index("ix_user_milestones_user_id", "user_id"),
        Index("ix_user_milestones_user_type_game", "user_id", "milestone_type", "game_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    milestone_type: Mapped[str] = mapped_column(String(50), nullable=False)
    game_id: Mapped[int | None] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    achievement_id: Mapped[int | None] = mapped_column(
        ForeignKey("achievements.id", ondelete="SET NULL")
    )
    achieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    game: Mapped["Game | None"] = relationship()
    achievement: Mapped["Achievement | None"] = relationship()


class Guide(Base):
    __tablename__ = "guides"
    __table_args__ = (
        Index("ix_guides_game_id", "game_id"),
        Index("ix_guides_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    header_image_s3_key: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    game: Mapped["Game"] = relationship()
    favorites: Mapped[list["GuideFavorite"]] = relationship(
        back_populates="guide", cascade="all, delete-orphan"
    )


class GuideFavorite(Base):
    __tablename__ = "guide_favorites"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    guide_id: Mapped[int] = mapped_column(
        ForeignKey("guides.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    guide: Mapped["Guide"] = relationship(back_populates="favorites")
