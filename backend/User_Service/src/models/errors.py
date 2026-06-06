class OAuthStateError(Exception):
    """CSRF state cookie is missing or does not match."""


class OAuthCodeMissingError(Exception):
    """GitHub did not provide an authorization code."""


class GitHubAPIError(Exception):
    """GitHub API returned an unexpected or error response."""


class SteamStateError(Exception):
    """Steam state cookie is missing or does not match."""


class SteamAuthError(Exception):
    """Steam OpenID assertion is invalid or the validation request failed."""


class TokenExpiredError(Exception):
    """JWT has passed its expiry time."""


class TokenInvalidError(Exception):
    """JWT signature or structure is invalid."""


class UserNotFoundError(Exception):
    """Referenced user does not exist."""


class SelfFollowError(Exception):
    """User attempted to follow themselves."""
