from fastapi import APIRouter, Depends

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.schemas import MilestoneEntry

router = APIRouter(prefix="/milestones")


@router.get("", response_model=list[MilestoneEntry])
async def get_own_milestones(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    return await _build_milestones(services, user_id)


@router.get("/{user_id}", response_model=list[MilestoneEntry])
async def get_user_milestones(
    user_id: int,
    services=Depends(get_services),
):
    return await _build_milestones(services, user_id)


async def _build_milestones(services, user_id: int) -> list[MilestoneEntry]:
    rows = await services.postgres.get_milestones(user_id)
    return [
        MilestoneEntry(
            id=r["id"],
            milestone_type=r["milestone_type"],
            game_id=r["game_id"],
            game_name=r["game_name"],
            achievement_id=r["achievement_id"],
            achievement_name=r["achievement_name"],
            achieved_at=r["achieved_at"],
        )
        for r in rows
    ]
