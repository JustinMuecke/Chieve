from contextlib import asynccontextmanager
from fastapi import FastAPI

from src.services.ServiceManager import ServiceManager
from src.routes import sync, games, profile, leaderboard, feed, search, milestones


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.services = ServiceManager()
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(sync.router, prefix="/api/achievements")
app.include_router(games.router, prefix="/api/achievements")
app.include_router(profile.router, prefix="/api/achievements")
app.include_router(leaderboard.router, prefix="/api/achievements")
app.include_router(feed.router, prefix="/api/achievements")
app.include_router(search.router, prefix="/api/achievements")
app.include_router(milestones.router, prefix="/api/achievements")
