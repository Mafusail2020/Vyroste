from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from app.api import router


@asynccontextmanager
async def lifespan(_: FastAPI):
    from app.scheduler import scheduler
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Виросте API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
