from fastapi import APIRouter, Depends, HTTPException

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.errors import SyncRateLimitedError
from src.models.schemas import SyncResponse, TaskStatusResponse
from src.worker.tasks import platform_sync_task

router = APIRouter(prefix="/sync")


@router.post("", response_model=SyncResponse, status_code=202)
async def trigger_sync(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        services.sync.check_and_set_rate_limit(user_id)
    except SyncRateLimitedError as e:
        raise HTTPException(status_code=429, detail=str(e))

    task = platform_sync_task.delay(user_id)
    return SyncResponse(task_id=task.id, status="queued")


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_sync_status(task_id: str):
    from src.worker.celery_app import celery_app

    result = celery_app.AsyncResult(task_id)
    progress = None
    if result.state == "STARTED" and isinstance(result.info, dict):
        progress = result.info.get("progress")
    return TaskStatusResponse(
        task_id=task_id,
        status=result.state,
        progress=progress,
        error=str(result.info) if result.state == "FAILURE" else None,
    )
