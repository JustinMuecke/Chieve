from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.services.ServiceManager import ServiceManager
from src.routes import login, me, steam
from src.routes import social, internal


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.services = ServiceManager()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(login.router, prefix="/api/user")
app.include_router(steam.router, prefix="/api/user")
app.include_router(me.router, prefix="/api/user")
app.include_router(social.router, prefix="/api/user")
app.include_router(internal.router)
