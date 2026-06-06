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
