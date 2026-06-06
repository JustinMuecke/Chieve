import os

from src.services.auth_service import AuthService
from src.services.postgres_service import PostgresService
from src.services.s3_service import S3Service
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
        self.s3 = S3Service(
            url=os.getenv("S3_URL", "http://minio:9000"),
            access_key=os.getenv("S3_ACCESS_KEY", ""),
            secret_key=os.getenv("S3_SECRET_KEY", ""),
        )
        self.sync = SyncService()
        self.milestone = MilestoneService(postgres=self.postgres)
        self.user_client = UserServiceClient()
