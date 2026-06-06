import os
from src.services.auth_service import AuthService
from src.services.postgres_service import PostgresService
from src.services.s3_service import S3Service
from src.services.github_oauth import GithubOAuthService
from src.services.platforms.steam.steam_service import SteamService


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
            url=os.getenv("S3_URL"),
            access_key=os.getenv("S3_ACCESS_KEY"),
            secret_key=os.getenv("S3_SECRET_KEY"),
        )
        self.github_oauth = GithubOAuthService(auth=self.auth, postgres=self.postgres, s3=self.s3)
        self.steam = SteamService(postgres=self.postgres, s3=self.s3)
