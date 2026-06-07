class TokenExpiredError(Exception):
    """JWT has passed its expiry time."""


class TokenInvalidError(Exception):
    """JWT signature or structure is invalid."""


class AchievementServiceError(Exception):
    """Call to Achievement Service internal API failed."""


class WishlistAlreadyExistsError(Exception):
    """Game is already on the user's wishlist."""


class WishlistNotFoundError(Exception):
    """Game is not on the user's wishlist."""


class DismissalAlreadyExistsError(Exception):
    """Game has already been dismissed by the user."""
