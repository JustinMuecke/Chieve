from pydantic import BaseModel


class AvatarOption(BaseModel):
    source: str
    url: str


class UserProfile(BaseModel):
    id: int
    username: str
    email: str | None
    avatar_url: str | None
    avatar_options: list[AvatarOption]
    linked_platforms: list[str]


class SelectAvatarRequest(BaseModel):
    source: str  # "github" | "steam" | "custom"


class UploadUrlResponse(BaseModel):
    upload_url: str
    key: str


class UserSummary(BaseModel):
    id: int
    username: str
    avatar_url: str | None
