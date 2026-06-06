import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import Response

from src.dependencies.auth import get_current_user_id, get_optional_user_id
from src.dependencies.services import get_services
from src.models.errors import (
    GameNotFoundError,
    GuideFavoriteAlreadyExistsError,
    GuideFavoriteNotFoundError,
    GuideForbiddenError,
    GuideNotFoundError,
    UserServiceError,
)
from src.models.schemas import GameGuidesResponse, GuideResponse

router = APIRouter()


def _content_url(guide_id: int) -> str:
    return f"/api/achievements/guides/{guide_id}/content"


def _header_url(guide_id: int) -> str:
    return f"/api/achievements/guides/{guide_id}/header"


def _to_response(
    row: dict,
    username: str | None,
    author_avatar_url: str | None,
) -> GuideResponse:
    guide_id = row["id"]
    return GuideResponse(
        id=guide_id,
        user_id=row["user_id"],
        username=username,
        author_avatar_url=author_avatar_url,
        app_id=row["app_id"],
        game_name=row["game_name"],
        title=row["title"],
        description=row.get("description"),
        content_url=_content_url(guide_id),
        header_image_url=_header_url(guide_id) if row.get("header_image_s3_key") else None,
        is_favorite=bool(row.get("is_favorite", False)),
        author_achievement_count=row.get("author_achievement_count", 0),
        game_total_achievements=row.get("game_total_achievements", 0),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/guides/{app_id}", response_model=GameGuidesResponse)
async def list_guides(
    app_id: int,
    services=Depends(get_services),
    user_id: int | None = Depends(get_optional_user_id),
):
    rows = await services.postgres.get_guides_for_game(app_id, user_id=user_id)

    if not rows:
        return GameGuidesResponse(app_id=app_id, game_name="", my_guides=[], other_guides=[])

    author_ids = list({row["user_id"] for row in rows})
    try:
        users = await services.user_client.get_users_by_ids(author_ids)
    except UserServiceError:
        users = []
    user_map = {u.id: u for u in users}

    game_name = rows[0]["game_name"]
    my_guides, other_guides = [], []
    for row in rows:
        author = user_map.get(row["user_id"])
        entry = _to_response(
            row,
            username=author.username if author else None,
            author_avatar_url=author.avatar_url if author else None,
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
    description: Optional[str] = Form(None),
    file: UploadFile = ...,
    header_image: Optional[UploadFile] = None,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    guide_uuid = str(uuid.uuid4())
    s3_key = services.s3.guide_key(user_id, guide_uuid)
    await services.s3.upload_guide(s3_key, await file.read())

    header_image_s3_key = None
    if header_image is not None:
        header_image_s3_key = services.s3.header_image_key(user_id, guide_uuid)
        await services.s3.upload_header_image(
            header_image_s3_key,
            await header_image.read(),
            header_image.content_type or "image/jpeg",
        )

    try:
        guide = await services.postgres.create_guide(
            user_id=user_id,
            external_app_id=app_id,
            title=title,
            description=description,
            s3_key=s3_key,
            header_image_s3_key=header_image_s3_key,
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
        description=guide.description,
        content_url=_content_url(guide.id),
        header_image_url=_header_url(guide.id) if guide.header_image_s3_key else None,
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


@router.put("/guides/{app_id}/{guide_id}", response_model=GuideResponse)
async def update_guide(
    app_id: int,
    guide_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = None,
    header_image: Optional[UploadFile] = None,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        guide = await services.postgres.update_guide(
            guide_id=guide_id,
            user_id=user_id,
            title=title,
            description=description,
        )
    except GuideNotFoundError:
        raise HTTPException(status_code=404, detail="Guide not found")
    except GuideForbiddenError:
        raise HTTPException(status_code=403, detail="You do not own this guide")

    if file is not None:
        await services.s3.upload_guide(guide.s3_key, await file.read())

    if header_image is not None:
        guide_uuid = guide.s3_key.split("/")[-1].replace(".md", "")
        header_key = services.s3.header_image_key(user_id, guide_uuid)
        await services.s3.upload_header_image(
            header_key,
            await header_image.read(),
            header_image.content_type or "image/jpeg",
        )
        guide = await services.postgres.update_guide(
            guide_id=guide_id,
            user_id=user_id,
            header_image_s3_key=header_key,
        )

    return GuideResponse(
        id=guide.id,
        user_id=guide.user_id,
        username=None,
        app_id=app_id,
        game_name=guide.game.name,
        title=guide.title,
        description=guide.description,
        content_url=_content_url(guide.id),
        header_image_url=_header_url(guide.id) if guide.header_image_s3_key else None,
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


@router.get("/guides/{guide_id}/content")
async def proxy_guide_content(
    guide_id: int,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        guide = await services.postgres.get_guide_by_id(guide_id)
    except GuideNotFoundError:
        raise HTTPException(status_code=404, detail="Guide not found")
    body, _ = await services.s3.get_object(guide.s3_key)
    return Response(content=body, media_type="text/markdown; charset=utf-8")


@router.get("/guides/{guide_id}/header")
async def proxy_guide_header(
    guide_id: int,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        guide = await services.postgres.get_guide_by_id(guide_id)
    except GuideNotFoundError:
        raise HTTPException(status_code=404, detail="Guide not found")
    if not guide.header_image_s3_key:
        raise HTTPException(status_code=404, detail="No header image")
    body, content_type = await services.s3.get_object(guide.header_image_s3_key)
    return Response(content=body, media_type=content_type)


@router.post("/guides/{guide_id}/favorite", status_code=204)
async def add_favorite(
    guide_id: int,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        await services.postgres.add_guide_favorite(user_id=user_id, guide_id=guide_id)
    except GuideNotFoundError:
        raise HTTPException(status_code=404, detail="Guide not found")
    except GuideFavoriteAlreadyExistsError:
        raise HTTPException(status_code=409, detail="Already favorited")


@router.delete("/guides/{guide_id}/favorite", status_code=204)
async def remove_favorite(
    guide_id: int,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        await services.postgres.remove_guide_favorite(user_id=user_id, guide_id=guide_id)
    except GuideFavoriteNotFoundError:
        raise HTTPException(status_code=404, detail="Favorite not found")
