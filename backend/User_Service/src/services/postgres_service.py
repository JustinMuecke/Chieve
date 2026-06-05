from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select

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
