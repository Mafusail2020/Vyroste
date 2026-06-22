from fastapi import APIRouter
from app.deps import get_supabase
from app.users import router as users_router
from app.catalog import router as catalog_router
from app.calendar import router as calendar_router
from app.calendars import router as calendars_router
from app.nurseries import router as nurseries_router
from app.admin import router as admin_router
from app.gdd import router as gdd_router
from app.payments import router as payments_router
from app.blog import router as blog_router

router = APIRouter()
router.include_router(users_router)
router.include_router(catalog_router)
router.include_router(calendar_router)
router.include_router(calendars_router)
router.include_router(nurseries_router)
router.include_router(admin_router)
router.include_router(gdd_router)
router.include_router(payments_router)
router.include_router(blog_router)


@router.get("/health")
async def health():
    try:
        result = get_supabase().table("climate_zones").select("id", count="exact").execute()
        return {"status": "ok", "climate_zones_count": result.count}
    except Exception:
        return {"status": "ok", "climate_zones_count": 0, "note": "Supabase not configured yet"}
