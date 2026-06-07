from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.models.recommendation import GameEmbedding, RecommendationDismissal, Wishlist
from src.models.errors import WishlistAlreadyExistsError, WishlistNotFoundError


class PostgresService:
    def __init__(self, host: str, username: str, password: str, database: str):
        url = f"postgresql+asyncpg://{username}:{password}@{host}/{database}"
        engine = create_async_engine(url)
        self._session = async_sessionmaker(engine, expire_on_commit=False)

    # ── Embeddings ────────────────────────────────────────────────────────────

    async def upsert_embedding(self, app_id: int, embedding: list[float]) -> None:
        embedding_str = "[" + ",".join(f"{x:.8f}" for x in embedding) + "]"
        async with self._session() as session:
            await session.execute(
                text("""
                    INSERT INTO game_embeddings (app_id, embedding, updated_at)
                    VALUES (:app_id, CAST(:embedding AS vector), NOW())
                    ON CONFLICT (app_id) DO UPDATE
                        SET embedding = EXCLUDED.embedding,
                            updated_at = EXCLUDED.updated_at
                """),
                {"app_id": app_id, "embedding": embedding_str},
            )
            await session.commit()

    async def get_embedding(self, app_id: int) -> list[float] | None:
        async with self._session() as session:
            result = await session.execute(
                select(GameEmbedding).where(GameEmbedding.app_id == app_id)
            )
            row = result.scalar_one_or_none()
            return list(row.embedding) if row else None

    async def get_embedded_app_ids(self) -> set[int]:
        async with self._session() as session:
            result = await session.execute(select(GameEmbedding.app_id))
            return {row[0] for row in result}

    async def get_nearest_app_ids(
        self, query_embedding: list[float], excluded_app_ids: list[int], limit: int
    ) -> list[tuple[int, float]]:
        """Returns [(app_id, similarity_score)] ordered by cosine similarity descending."""
        embedding_str = "[" + ",".join(f"{x:.8f}" for x in query_embedding) + "]"
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT app_id, 1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
                    FROM game_embeddings
                    WHERE app_id != ALL(:excluded)
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT :limit
                """),
                {"embedding": embedding_str, "excluded": excluded_app_ids or [-1], "limit": limit},
            )
            return [(row.app_id, float(row.similarity)) for row in result]

    # ── Wishlist ──────────────────────────────────────────────────────────────

    async def add_to_wishlist(self, user_id: int, app_id: int) -> datetime:
        async with self._session() as session:
            existing = await session.execute(
                select(Wishlist).where(
                    Wishlist.user_id == user_id, Wishlist.app_id == app_id
                )
            )
            if existing.scalar_one_or_none():
                raise WishlistAlreadyExistsError()
            item = Wishlist(user_id=user_id, app_id=app_id)
            session.add(item)
            await session.commit()
            return item.added_at

    async def remove_from_wishlist(self, user_id: int, app_id: int) -> None:
        async with self._session() as session:
            result = await session.execute(
                select(Wishlist).where(
                    Wishlist.user_id == user_id, Wishlist.app_id == app_id
                )
            )
            item = result.scalar_one_or_none()
            if not item:
                raise WishlistNotFoundError()
            await session.delete(item)
            await session.commit()

    async def get_wishlist_entries(self, user_id: int) -> list[tuple[int, datetime]]:
        """Returns [(app_id, added_at)] for the user's wishlist."""
        async with self._session() as session:
            result = await session.execute(
                select(Wishlist.app_id, Wishlist.added_at)
                .where(Wishlist.user_id == user_id)
                .order_by(Wishlist.added_at.desc())
            )
            return [(row.app_id, row.added_at) for row in result]

    async def get_wishlist_app_ids(self, user_id: int) -> list[int]:
        async with self._session() as session:
            result = await session.execute(
                select(Wishlist.app_id).where(Wishlist.user_id == user_id)
            )
            return [row[0] for row in result]

    # ── Dismissals ────────────────────────────────────────────────────────────

    async def add_dismissal(self, user_id: int, app_id: int) -> None:
        async with self._session() as session:
            stmt = (
                insert(RecommendationDismissal)
                .values(user_id=user_id, app_id=app_id)
                .on_conflict_do_nothing()
            )
            await session.execute(stmt)
            await session.commit()

    async def get_dismissed_app_ids(self, user_id: int) -> list[int]:
        async with self._session() as session:
            result = await session.execute(
                select(RecommendationDismissal.app_id).where(
                    RecommendationDismissal.user_id == user_id
                )
            )
            return [row[0] for row in result]
