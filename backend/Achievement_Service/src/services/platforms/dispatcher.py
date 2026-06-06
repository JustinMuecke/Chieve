from src.services.platforms.base import BasePlatformService
from src.services.platforms.steam import SteamPlatformService

# Registry: add new platforms here
_REGISTRY: dict[str, BasePlatformService] = {
    "steam": SteamPlatformService(),
}


def get_platform_service(platform_name: str) -> BasePlatformService | None:
    return _REGISTRY.get(platform_name)


def supported_platforms() -> list[str]:
    return list(_REGISTRY.keys())
