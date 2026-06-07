import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.services.ServiceManager import ServiceManager
from src.routes import recommendations, wishlist


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.services = ServiceManager()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendations.router, prefix="/api/recommendations")
app.include_router(wishlist.router, prefix="/api/recommendations")
