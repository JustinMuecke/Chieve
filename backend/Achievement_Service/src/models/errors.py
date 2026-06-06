class TokenExpiredError(Exception):
    """JWT has passed its expiry time."""


class TokenInvalidError(Exception):
    """JWT signature or structure is invalid."""


class SyncRateLimitedError(Exception):
    """User has triggered a sync too recently."""


class SteamNotLinkedError(Exception):
    """User has no Steam account linked."""


class SteamPrivateProfileError(Exception):
    """Steam profile or game details are set to private."""


class SteamAPIError(Exception):
    """Steam Web API returned an unexpected response."""


class GameNotFoundError(Exception):
    """Requested game does not exist in the database."""


class UserServiceError(Exception):
    """Call to User Service internal API failed."""
