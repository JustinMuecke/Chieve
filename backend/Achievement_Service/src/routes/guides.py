import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile

from src.dependencies.auth import get_current_user_id, get_optional_user_id
from src.dependencies.services import get_services
from src.models.errors import (
    GameNotFoundError,
    GuideForbiddenError,
    GuideNotFoundError,
    UserServiceError,
)
from src.models.schemas import GameGuidesResponse, GuideResponse

router = APIRouter()


def _to_response(row: dict, username: str | None, content_url: str) -> GuideResponse:
    return GuideResponse(
        id=row["id"],
        user_id=row["user_id"],
        username=username,
        app_id=row["app_id"],
        game_name=row["game_name"],
        title=row["title"],
        content_url=content_url,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/guides/{app_id}", response_model=GameGuidesResponse)
async def list_guides(
    app_id: int,
    services=Depends(get_services),
    user_id: int | None = Depends(get_optional_user_id),
):
    rows = await services.postgres.get_guides_for_game(app_id)

    if not rows:
        return GameGuidesResponse(app_id=app_id, game_name="", my_guides=[], other_guides=[])

    author_ids = list({row["user_id"] for row in rows})
    try:
        users = await services.user_client.get_users_by_ids(author_ids)
    except UserServiceError:
        users = []
    username_map = {u.id: u.username for u in users}

    game_name = rows[0]["game_name"]
    my_guides, other_guides = [], []
    for row in rows:
        entry = _to_response(
            row,
            username_map.get(row["user_id"]),
            services.s3.get_url(row["s3_key"]),
        )
        if user_id is not None and row["user_id"] == user_id:
            my_guides.append(entry)
        else:
            other_guides.append(entry)

    return GameGuidesResponse(
        app_id=app_id, game_name=game_name, my_guides=my_guides, other_guides=other_guides
    )


@router.post("/guides/{app_id}", response_model=GuideResponse, status_code=201)
async def create_guide(
    app_id: int,
    title: str = Form(...),
    file: UploadFile = ...,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    content = await file.read()
    s3_key = services.s3.guide_key(user_id, str(uuid.uuid4()))
    await services.s3.upload_guide(s3_key, content)

    try:
        guide = await services.postgres.create_guide(
            user_id=user_id,
            external_app_id=app_id,
            title=title,
            s3_key=s3_key,
        )
    except GameNotFoundError:
        await services.s3.delete_guide(s3_key)
        raise HTTPException(status_code=404, detail="Game not found")

    return GuideResponse(
        id=guide.id,
        user_id=guide.user_id,
        username=None,
        app_id=app_id,
        game_name=guide.game.name,
        title=guide.title,
        content_url=services.s3.get_url(guide.s3_key),
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


@router.put("/guides/{app_id}/{guide_id}", response_model=GuideResponse)
async def update_guide(
    app_id: int,
    guide_id: int,
    title: str | None = Form(None),
    file: UploadFile | None = None,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        guide = await services.postgres.update_guide(
            guide_id=guide_id,
            user_id=user_id,
            title=title,
        )
    except GuideNotFoundError:
        raise HTTPException(status_code=404, detail="Guide not found")
    except GuideForbiddenError:
        raise HTTPException(status_code=403, detail="You do not own this guide")

    if file is not None:
        content = await file.read()
        await services.s3.upload_guide(guide.s3_key, content)

    return GuideResponse(
        id=guide.id,
        user_id=guide.user_id,
        username=None,
        app_id=app_id,
        game_name=guide.game.name,
        title=guide.title,
        content_url=services.s3.get_url(guide.s3_key),
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )
