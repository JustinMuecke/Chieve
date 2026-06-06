from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, select

from src.models.follow import Follow
from src.models.user import LinkedAccount, User


class PostgresService:
    def __init__(self, host: str, username: str, password: str, database: str):
        url = f"postgresql+asyncpg://{username}:{password}@{host}/{database}"
        engine = create_async_engine(url)
        self._session = async_sessionmaker(engine, expire_on_commit=False)

    async def get_or_create_user(self, github_id: str, username: str, email: str | None) -> User:
        async with self._session() as session:
            result = await session.execute(select(User).where(User.github_id == github_id))
            user = result.scalar_one_or_none()
            if user is None:
                user = User(github_id=github_id, username=username, email=email)
                session.add(user)
                await session.commit()
            return user

    async def get_user_by_id(self, user_id: int) -> User | None:
        async with self._session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()

    async def get_user_with_linked_accounts(self, user_id: int) -> User | None:
        async with self._session() as session:
            result = await session.execute(
                select(User)
                .options(selectinload(User.linked_accounts))
                .where(User.id == user_id)
            )
            return result.scalar_one_or_none()

    async def update_github_avatar(self, user_id: int, avatar_url: str) -> None:
        async with self._session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.github_avatar_url = avatar_url
                if user.avatar_url is None:
                    user.avatar_url = avatar_url
                await session.commit()

    async def update_user_avatar(self, user_id: int, avatar_url: str) -> None:
        async with self._session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.avatar_url = avatar_url
                await session.commit()

    async def update_linked_account_avatar(self, user_id: int, platform: str, avatar_url: str) -> None:
        async with self._session() as session:
            result = await session.execute(
                select(LinkedAccount).where(
                    LinkedAccount.user_id == user_id,
                    LinkedAccount.platform == platform,
                )
            )
            account = result.scalar_one_or_none()
            if account:
                account.avatar_url = avatar_url
                await session.commit()

    async def delete_linked_account(self, user_id: int, platform: str) -> None:
        async with self._session() as session:
            result = await session.execute(
                select(LinkedAccount).where(
                    LinkedAccount.user_id == user_id,
                    LinkedAccount.platform == platform,
                )
            )
            account = result.scalar_one_or_none()
            if not account:
                return

            platform_avatar = account.avatar_url

            await session.execute(
                delete(LinkedAccount).where(
                    LinkedAccount.user_id == user_id,
                    LinkedAccount.platform == platform,
                )
            )

            # If the user's active avatar came from this platform, fall back to GitHub avatar
            if platform_avatar:
                user_result = await session.execute(select(User).where(User.id == user_id))
                user = user_result.scalar_one_or_none()
                if user and user.avatar_url == platform_avatar:
                    user.avatar_url = user.github_avatar_url

            await session.commit()

    async def link_platform(self, user_id: int, platform: str, platform_user_id: str) -> LinkedAccount:
        async with self._session() as session:
            result = await session.execute(
                select(LinkedAccount).where(
                    LinkedAccount.user_id == user_id,
                    LinkedAccount.platform == platform,
                )
            )
            account = result.scalar_one_or_none()
            if account is None:
                account = LinkedAccount(
                    user_id=user_id,
                    platform=platform,
                    platform_user_id=platform_user_id,
                )
                session.add(account)
            else:
                account.platform_user_id = platform_user_id
            await session.commit()
            return account

    async def follow(self, follower_id: int, following_id: int) -> bool:
        """Returns True if a new follow was created, False if already following."""
        async with self._session() as session:
            existing = await session.execute(
                select(Follow).where(
                    Follow.follower_id == follower_id,
                    Follow.following_id == following_id,
                )
            )
            if existing.scalar_one_or_none():
                return False
            session.add(Follow(follower_id=follower_id, following_id=following_id))
            await session.commit()
            return True

    async def unfollow(self, follower_id: int, following_id: int) -> bool:
        """Returns True if a follow was removed, False if not found."""
        async with self._session() as session:
            result = await session.execute(
                delete(Follow).where(
                    Follow.follower_id == follower_id,
                    Follow.following_id == following_id,
                )
            )
            await session.commit()
            return result.rowcount > 0

    async def get_following(self, user_id: int) -> list[User]:
        async with self._session() as session:
            result = await session.execute(
                select(User)
                .join(Follow, Follow.following_id == User.id)
                .where(Follow.follower_id == user_id)
                .order_by(Follow.created_at.desc())
            )
            return list(result.scalars().all())

    async def get_users_by_ids(self, user_ids: list[int]) -> list[User]:
        if not user_ids:
            return []
        async with self._session() as session:
            result = await session.execute(
                select(User).where(User.id.in_(user_ids))
            )
            return list(result.scalars().all())

    async def get_followers(self, user_id: int) -> list[User]:
        async with self._session() as session:
            result = await session.execute(
                select(User)
                .join(Follow, Follow.follower_id == User.id)
                .where(Follow.following_id == user_id)
                .order_by(Follow.created_at.desc())
            )
            return list(result.scalars().all())
