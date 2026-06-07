import os
import jwt

from src.models.errors import TokenExpiredError, TokenInvalidError


class AuthService:
    def __init__(self):
        self.jwt_secret = os.getenv("JWT_SECRET", "supersecretkey")

    def decode_token(self, token: str) -> int:
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            return int(payload["sub"])
        except jwt.ExpiredSignatureError as e:
            raise TokenExpiredError("Session expired") from e
        except jwt.InvalidTokenError as e:
            raise TokenInvalidError("Invalid token") from e

    def decode_service_token(self, token: str) -> str:
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            if payload.get("type") != "service":
                raise TokenInvalidError("Not a service token")
            return payload["service"]
        except jwt.ExpiredSignatureError as e:
            raise TokenExpiredError("Service token expired") from e
        except jwt.InvalidTokenError as e:
            raise TokenInvalidError("Invalid service token") from e
