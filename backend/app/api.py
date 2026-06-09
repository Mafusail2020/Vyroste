from functools import lru_cache
from fastapi import APIRouter
from supabase import create_client, Client
from core.config import settings

router = APIRouter()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


@router.get("/health")
async def health():
    try:
        result = get_supabase().table("climate_zones").select("id", count="exact").execute()
        return {"status": "ok", "climate_zones_count": result.count}
    except Exception:
        return {"status": "ok", "climate_zones_count": 0, "note": "Supabase not configured yet"}
