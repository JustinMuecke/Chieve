from datetime import datetime
from sqlalchemy import DateTime, String, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    github_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    github_avatar_url: Mapped[str | None] = mapped_column(String(500))
    banner_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    linked_accounts: Mapped[list["LinkedAccount"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class LinkedAccount(Base):
    __tablename__ = "linked_accounts"
    __table_args__ = (UniqueConstraint("user_id", "platform"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    platform_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="linked_accounts")
