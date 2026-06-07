import os
from celery import Celery
from celery.schedules import crontab

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "achievement_worker",
    broker=redis_url,
    backend=redis_url,
    include=["src.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
)

celery_app.conf.beat_schedule = {
    "backfill-game-descriptions": {
        "task": "backfill_game_descriptions",
        "schedule": crontab(hour=2, minute=0),  # nightly at 2 AM UTC
    },
    "refresh-community-points": {
        "task": "refresh_community_points",
        "schedule": crontab(hour=4, minute=0),  # nightly at 4 AM UTC
    },
}
