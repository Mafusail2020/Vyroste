from datetime import date
from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter()


@router.get("/gdd/me")
async def get_my_gdd(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()

    profile = (
        sb.table("user_profiles")
        .select("region_id,selected_crops")
        .eq("id", current_user["id"])
        .maybe_single()
        .execute()
    )
    if not profile.data:
        return {"region_id": None, "season_start": None, "crops": []}

    region_id = profile.data.get("region_id")
    selected: list[str] = profile.data.get("selected_crops") or []

    if not region_id or not selected:
        return {"region_id": region_id, "season_start": None, "crops": []}

    season_start = f"{date.today().year}-04-01"

    # Raw weather rows since season start
    rows = (
        sb.table("gdd_accumulation")
        .select("tmax,tmin")
        .eq("region_id", region_id)
        .gte("date", season_start)
        .lte("date", date.today().isoformat())
        .execute()
    )
    weather = rows.data or []

    # Fetch crops
    crops_res = (
        sb.table("crops")
        .select("id,name_uk,base_temperature,gdd_to_harvest")
        .in_("id", selected)
        .execute()
    )

    result = []
    for crop in (crops_res.data or []):
        base = float(crop.get("base_temperature") or 10)
        target = int(crop.get("gdd_to_harvest") or 0)
        accumulated = sum(
            max(0.0, (r["tmax"] + r["tmin"]) / 2 - base)
            for r in weather
            if r.get("tmax") is not None and r.get("tmin") is not None
        )
        pct = round(min(accumulated / target, 1.0), 3) if target > 0 else 0.0
        result.append({
            "crop_id":        crop["id"],
            "crop_name":      crop["name_uk"],
            "base_temperature": base,
            "gdd_to_harvest": target,
            "gdd_accumulated": round(accumulated, 1),
            "pct":            pct,
        })

    return {"region_id": region_id, "season_start": season_start, "crops": result}


@router.post("/gdd/run", status_code=200)
async def trigger_gdd_job(_: dict = Depends(get_current_user)):
    """Manually trigger the GDD job (for testing). Runs synchronously."""
    from app.scheduler import run_gdd_job
    run_gdd_job()
    return {"status": "ok"}
