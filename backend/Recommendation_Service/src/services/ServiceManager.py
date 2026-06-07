import os

from src.services.auth_service import AuthService
from src.services.postgres_service import PostgresService
from src.services.achievement_service_client import AchievementServiceClient
from src.services.recommendation_service import RecommendationService
from src.services.wishlist_service import WishlistService


class ServiceManager:
    def __init__(self):
        self.auth = AuthService()
        self.postgres = PostgresService(
            host=os.getenv("POSTGRES_HOST"),
            username=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            database=os.getenv("POSTGRES_DB"),
        )
        self.achievement_client = AchievementServiceClient()
        self.recommendation = RecommendationService()
        self.wishlist = WishlistService()
