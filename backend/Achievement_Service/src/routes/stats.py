from fastapi import APIRouter, Depends

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.schemas import StatsResponse, StatsTimelineEntry

router = APIRouter(prefix="/stats")


@router.get("", response_model=StatsResponse)
async def get_own_stats(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    rows = await services.postgres.get_user_stats_timeline(user_id)
    return StatsResponse(timeline=[StatsTimelineEntry(**r) for r in rows])


@router.get("/{user_id}", response_model=StatsResponse)
async def get_user_stats(
    user_id: int,
    services=Depends(get_services),
):
    rows = await services.postgres.get_user_stats_timeline(user_id)
    return StatsResponse(timeline=[StatsTimelineEntry(**r) for r in rows])
