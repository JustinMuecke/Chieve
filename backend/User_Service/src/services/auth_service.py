import os
import jwt
from datetime import datetime, timedelta, timezone

from src.models.errors import TokenExpiredError, TokenInvalidError


class AuthService:
    def __init__(self):
        self.jwt_secret = os.getenv("JWT_SECRET", "supersecretkey")

    def create_token(self, user_id: int, username: str) -> str:
        return jwt.encode(
            {
                "sub": str(user_id),
                "username": username,
                "exp": datetime.now(timezone.utc) + timedelta(days=7),
            },
            self.jwt_secret,
            algorithm="HS256",
        )

    def decode_token(self, token: str) -> int:
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            return int(payload["sub"])
        except jwt.ExpiredSignatureError as e:
            raise TokenExpiredError("Session expired") from e
        except jwt.InvalidTokenError as e:
            raise TokenInvalidError("Invalid token") from e

    def decode_service_token(self, token: str) -> str:
        """Validates a service-to-service JWT and returns the calling service name."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            if payload.get("type") != "service":
                raise TokenInvalidError("Not a service token")
            return payload["service"]
        except jwt.ExpiredSignatureError as e:
            raise TokenExpiredError("Service token expired") from e
        except jwt.InvalidTokenError as e:
            raise TokenInvalidError("Invalid service token") from e
