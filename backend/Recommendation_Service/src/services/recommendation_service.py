import asyncio
import random

from src.models.errors import AchievementServiceError
from src.models.schemas import RecommendationItem, RecommendationsResponse


class RecommendationService:
    async def get_recommendations(
        self,
        user_id: int,
        limit: int,
        postgres,
        achievement_client,
    ) -> RecommendationsResponse:
        owned_ids, completions, dismissed_ids, wishlisted_ids = await asyncio.gather(
            achievement_client.get_owned_app_ids(user_id),
            achievement_client.get_user_game_completion(user_id),
            postgres.get_dismissed_app_ids(user_id),
            postgres.get_wishlist_app_ids(user_id),
        )

        excluded_ids = list(set(owned_ids + dismissed_ids + wishlisted_ids))
        embedded_ids = await postgres.get_embedded_app_ids()

        anchor_result = await self._pick_anchor(completions, embedded_ids, excluded_ids, postgres)
        if anchor_result is None:
            return RecommendationsResponse(items=[])

        anchor_embedding, anchor_app_id = anchor_result

        candidates = await postgres.get_nearest_app_ids(anchor_embedding, excluded_ids, limit * 2)
        if not candidates:
            return RecommendationsResponse(items=[])

        result_app_ids = [app_id for app_id, _ in candidates[:limit]]
        similarity_map = {app_id: score for app_id, score in candidates}

        try:
            game_details, anchor_games = await asyncio.gather(
                achievement_client.get_games_by_app_ids(result_app_ids),
                achievement_client.get_games_by_app_ids([anchor_app_id]),
            )
        except AchievementServiceError:
            return RecommendationsResponse(items=[])

        anchor_game_name = anchor_games[0].get("name") if anchor_games else None

        items = []
        for game in game_details:
            app_id = game["app_id"]
            items.append(RecommendationItem(
                app_id=app_id,
                name=game["name"],
                header_image_url=game.get("header_image_url"),
                description=game.get("description"),
                tags=game.get("tags"),
                similarity_score=round(similarity_map.get(app_id, 0.0), 4),
                achievement_count=game.get("achievement_count", 0),
            ))

        items.sort(key=lambda x: x.similarity_score, reverse=True)
        return RecommendationsResponse(
            items=items,
            anchor_game_name=anchor_game_name,
            anchor_app_id=anchor_app_id,
        )

    async def _pick_anchor(
        self,
        completions: list[dict],
        embedded_ids: set[int],
        excluded_ids: list[int],
        postgres,
    ) -> tuple[list[float], int] | None:
        pool = [c for c in completions if c["app_id"] in embedded_ids]

        if pool:
            # In-progress games weighted by completion %; 100%-complete games get a
            # fixed reduced weight so they're possible anchors but don't dominate.
            weights = [30.0 if c["completion_pct"] >= 100 else max(c["completion_pct"], 1.0) for c in pool]
            chosen = random.choices(pool, weights=weights, k=1)[0]
            embedding = await postgres.get_embedding(chosen["app_id"])
            return embedding, chosen["app_id"]

        # No owned games have embeddings yet — use a random unowned embedded game.
        fallback_ids = list(embedded_ids - set(excluded_ids))
        if not fallback_ids:
            return None

        chosen_id = random.choice(fallback_ids)
        embedding = await postgres.get_embedding(chosen_id)
        return embedding, chosen_id
