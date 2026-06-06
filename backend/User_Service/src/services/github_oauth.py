import os
import secrets
from fastapi import Request
from fastapi.responses import RedirectResponse
import httpx

from src.models.errors import GitHubAPIError, OAuthCodeMissingError, OAuthStateError
from src.services.auth_service import AuthService
from src.services.postgres_service import PostgresService
from src.services.s3_service import S3Service

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


class GithubOAuthService:
    def __init__(self, auth: AuthService, postgres: PostgresService, s3: S3Service):
        self.auth = auth
        self.postgres = postgres
        self.s3 = s3
        self.github_client_id = os.getenv("GITHUB_CLIENT_ID")
        self.github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self.callback_url = os.getenv("OAUTH_CALLBACK_URL", "http://localhost:8000/api/user/auth/callback")
        self.github_scopes = "read:user user:email"
        self._secure_cookies = os.getenv("ENV") == "production"

    def login(self):
        state = secrets.token_urlsafe(32)
        response = RedirectResponse(
            url=(
                f"{GITHUB_AUTH_URL}"
                f"?client_id={self.github_client_id}"
                f"&scope={self.github_scopes}"
                f"&state={state}"
                f"&redirect_uri={self.callback_url}"
            )
        )
        response.set_cookie(
            key="oauth_state",
            value=state,
            httponly=True,
            max_age=300,
            samesite="lax",
            secure=self._secure_cookies,
        )
        return response

    async def callback(self, request: Request, code: str = None, state: str = None):
        cookie_state = request.cookies.get("oauth_state")
        if not cookie_state or cookie_state != state:
            raise OAuthStateError("State verification failed (possible CSRF request)")

        if not code:
            raise OAuthCodeMissingError("Code not provided by GitHub")

        async with httpx.AsyncClient() as client:
            try:
                token_response = await client.post(
                    GITHUB_TOKEN_URL,
                    headers={"Accept": "application/json"},
                    data={
                        "client_id": self.github_client_id,
                        "client_secret": self.github_client_secret,
                        "code": code,
                    },
                )
                token_response.raise_for_status()
                access_token = token_response.json().get("access_token")

                if not access_token:
                    raise GitHubAPIError("Failed to retrieve access token from GitHub")

                gh_headers = {
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": "Chieve-App",
                    "Accept": "application/json",
                }

                profile_response = await client.get(GITHUB_USER_URL, headers=gh_headers)
                profile_response.raise_for_status()
                profile = profile_response.json()
                github_id = str(profile.get("id"))
                username = profile.get("login")
                github_avatar_url = profile.get("avatar_url")

                email_response = await client.get(GITHUB_EMAILS_URL, headers=gh_headers)
                email_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise GitHubAPIError(f"GitHub API request failed: {e.response.status_code}") from e

        primary_email = next(
            (e["email"] for e in email_response.json() if e.get("primary") and e.get("verified")),
            None,
        )

        user = await self.postgres.get_or_create_user(
            github_id=github_id,
            username=username,
            email=primary_email,
        )

        if github_avatar_url:
            await self.postgres.update_github_avatar(user.id, github_avatar_url)
            try:
                key = self.s3.avatar_key(user.id, "github")
                s3_url = await self.s3.copy_from_url(github_avatar_url, key)
                await self.postgres.update_github_avatar(user.id, s3_url)
            except Exception:
                pass  # S3 copy is best-effort; CDN URL already saved above

        app_jwt = self.auth.create_token(user.id, user.username)

        redirect = RedirectResponse(url=f"{self.frontend_url}")
        redirect.delete_cookie("oauth_state")
        redirect.set_cookie(
            key="auth_token",
            value=app_jwt,
            httponly=True,
            samesite="lax",
            secure=self._secure_cookies,
            max_age=7 * 24 * 60 * 60,
        )
        return redirect
