import asyncio
import os

from sentence_transformers import SentenceTransformer

from src.worker.celery_app import celery_app
from src.services.postgres_service import PostgresService
from src.services.achievement_service_client import AchievementServiceClient
from src.models.errors import AchievementServiceError

_model = SentenceTransformer("all-MiniLM-L6-v2")


def _make_postgres() -> PostgresService:
    return PostgresService(
        host=os.getenv("POSTGRES_HOST"),
        username=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        database=os.getenv("POSTGRES_DB"),
    )


def _build_text(name: str, description: str | None, tags: list[str] | None) -> str:
    parts = [name]
    if description:
        parts.append(description)
    if tags:
        parts.append(" ".join(tags))
    return " ".join(parts).strip()


@celery_app.task(name="generate_embedding_for_game")
def generate_embedding_for_game_task(app_id: int, name: str, description: str | None, tags: list[str] | None):
    asyncio.run(_generate_embedding_for_game(app_id, name, description, tags))


async def _generate_embedding_for_game(
    app_id: int, name: str, description: str | None, tags: list[str] | None
) -> None:
    pg = _make_postgres()
    if await pg.get_embedding(app_id) is not None:
        return  # already embedded

    text = _build_text(name, description, tags)
    embedding = _model.encode(text).tolist()
    await pg.upsert_embedding(app_id, embedding)


@celery_app.task(name="generate_embeddings")
def generate_embeddings_task():
    asyncio.run(_generate_missing_embeddings())


async def _generate_missing_embeddings():
    pg = _make_postgres()
    client = AchievementServiceClient()

    offset = 0
    batch_size = 100
    while True:
        try:
            games = await client.get_all_games(limit=batch_size, offset=offset)
        except AchievementServiceError:
            break
        if not games:
            break

        for game in games:
            text = _build_text(
                game["name"],
                game.get("description"),
                game.get("tags"),
            )
            embedding = _model.encode(text).tolist()
            await pg.upsert_embedding(game["app_id"], embedding)

        if len(games) < batch_size:
            break
        offset += batch_size
