from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from app.api import router


@asynccontextmanager
async def lifespan(_: FastAPI):
    from app.scheduler import scheduler
    from app.deps import get_supabase
    scheduler.start()
    try:
        sb = get_supabase()
        result = sb.table("climate_zones").select("id", count="exact").limit(1).execute()
        count = result.count or 0
        print(f"[startup] Supabase OK — {count} climate zones")
    except Exception as exc:
        print(f"[startup] WARNING: Supabase connection failed — {exc}")
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Виросте API", version="0.1.0", lifespan=lifespan)

# FRONTEND_ORIGIN may be a comma-separated list; tolerate trailing slashes.
_allowed_origins = [
    o.strip().rstrip("/")
    for o in settings.frontend_origin.split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Vercel preview/prod deploys
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
