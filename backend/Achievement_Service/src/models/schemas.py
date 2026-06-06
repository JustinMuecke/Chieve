from datetime import datetime
from pydantic import BaseModel


# ── Shared ────────────────────────────────────────────────────────────────────

class UserSummary(BaseModel):
    id: int
    username: str
    avatar_url: str | None


# ── Sync ──────────────────────────────────────────────────────────────────────

class SyncResponse(BaseModel):
    task_id: str
    status: str  # "queued"


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str  # "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RATE_LIMITED"
    progress: int | None = None
    error: str | None = None


# ── Games / Library ───────────────────────────────────────────────────────────

class AchievementDetail(BaseModel):
    api_name: str
    display_name: str | None
    description: str | None
    icon_url: str | None
    global_unlock_percent: float | None
    global_points: int
    unlocked: bool
    unlocked_at: datetime | None


class GameCatalogEntry(BaseModel):
    app_id: int
    name: str
    header_image_url: str | None
    total_achievements: int


class GameSummary(BaseModel):
    app_id: int
    name: str
    header_image_url: str | None
    total_achievements: int
    unlocked_achievements: int
    completion_percent: float


class GameDetail(BaseModel):
    app_id: int
    name: str
    header_image_url: str | None
    achievements: list[AchievementDetail]


# ── Profile ───────────────────────────────────────────────────────────────────

class UserStats(BaseModel):
    user_id: int
    total_achievements: int
    total_global_points: int
    total_community_points: int
    updated_at: datetime | None


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar_url: str | None
    total_achievements: int
    total_global_points: int
    total_community_points: int


class LeaderboardResponse(BaseModel):
    scope: str       # "global" | "friends"
    sort_by: str     # "global_points" | "community_points"
    page: int
    page_size: int
    total: int
    entries: list[LeaderboardEntry]


# ── Feed ──────────────────────────────────────────────────────────────────────

class FeedAchievement(BaseModel):
    api_name: str
    display_name: str | None
    icon_url: str | None
    global_points: int
    unlocked_at: datetime


class FeedGame(BaseModel):
    app_id: int
    name: str
    header_image_url: str | None
    achievements: list[FeedAchievement]


class FeedUserEntry(BaseModel):
    user_id: int
    username: str
    avatar_url: str | None
    games: list[FeedGame]


class FeedResponse(BaseModel):
    generated_at: datetime
    days: int
    entries: list[FeedUserEntry]


# ── Search ────────────────────────────────────────────────────────────────────

class AchievementSearchResult(BaseModel):
    achievement_id: int
    api_name: str
    display_name: str | None
    description: str | None
    icon_url: str | None
    global_unlock_percent: float | None
    global_points: int
    app_id: int
    game_name: str


# ── Milestones ────────────────────────────────────────────────────────────────

class MilestoneEntry(BaseModel):
    id: int
    milestone_type: str
    game_id: int | None
    game_name: str | None
    achievement_id: int | None
    achievement_name: str | None
    achieved_at: datetime
