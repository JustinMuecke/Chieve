from abc import ABC, abstractmethod


class BasePlatformService(ABC):
    """
    Contract for a platform-specific sync service.
    Each implementation knows how to fetch games and achievements
    for one external platform (Steam, Xbox, PlayStation, ...).
    """

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Identifier matching linked_accounts.platform — e.g. 'steam'."""

    @abstractmethod
    async def sync_user(
        self,
        user_id: int,
        platform_user_id: str,
        postgres,
        milestone_svc,
        progress_callback,
    ) -> dict:
        """
        Perform a full sync for one user on this platform.

        Args:
            user_id:            Internal Chieve user ID.
            platform_user_id:   Platform-specific ID (e.g. SteamID64).
            postgres:           PostgresService instance.
            milestone_svc:      MilestoneService instance.
            progress_callback:  Callable(percent: int) — update Celery task progress.

        Returns:
            Dict with at minimum {"status": str, "games_processed": int}.
        """
