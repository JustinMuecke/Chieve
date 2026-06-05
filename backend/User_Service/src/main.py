from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.services.ServiceManager import ServiceManager
from src.routes import login, steam


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.services = ServiceManager()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(login.router, prefix="/api/user")
app.include_router(steam.router, prefix="/api/user")
