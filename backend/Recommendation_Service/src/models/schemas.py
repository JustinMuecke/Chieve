from datetime import datetime
from pydantic import BaseModel, computed_field


class RecommendationItem(BaseModel):
    app_id: int
    name: str
    header_image_url: str | None
    description: str | None
    tags: list[str] | None
    similarity_score: float
    achievement_count: int

    @computed_field
    @property
    def steam_url(self) -> str:
        return f"https://store.steampowered.com/app/{self.app_id}/"


class RecommendationsResponse(BaseModel):
    items: list[RecommendationItem]
    anchor_game_name: str | None = None
    anchor_app_id: int | None = None


class WishlistItem(BaseModel):
    app_id: int
    name: str
    header_image_url: str | None
    description: str | None
    tags: list[str] | None
    achievement_count: int
    added_at: datetime

    @computed_field
    @property
    def steam_url(self) -> str:
        return f"https://store.steampowered.com/app/{self.app_id}/"


class WishlistResponse(BaseModel):
    items: list[WishlistItem]
