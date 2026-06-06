import os

from src.services.auth_service import AuthService
from src.services.postgres_service import PostgresService
from src.services.sync_service import SyncService
from src.services.milestone_service import MilestoneService
from src.services.user_service_client import UserServiceClient


class ServiceManager:
    def __init__(self):
        self.auth = AuthService()
        self.postgres = PostgresService(
            host=os.getenv("POSTGRES_HOST"),
            username=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            database=os.getenv("POSTGRES_DB"),
        )
        self.sync = SyncService()
        self.milestone = MilestoneService(postgres=self.postgres)
        self.user_client = UserServiceClient()
