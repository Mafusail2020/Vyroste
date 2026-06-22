from datetime import date
from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter()


def _resolve_calendar(sb, user_id: str, calendar_id: str | None) -> dict | None:
    """The requested calendar (ownership-checked) or the user's earliest one."""
    q = sb.table("calendars").select("region_id,selected_varieties").eq("user_id", user_id)
    if calendar_id:
        res = q.eq("id", calendar_id).maybe_single().execute()
        return res.data
    res = q.order("created_at").limit(1).execute()
    return res.data[0] if res.data else None


@router.get("/gdd/me")
async def get_my_gdd(
    calendar_id: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    sb = get_supabase()

    cal = _resolve_calendar(sb, current_user["id"], calendar_id)
    if not cal:
        return {"region_id": None, "season_start": None, "crops": []}

    region_id = cal.get("region_id")
    variety_ids: list[str] = cal.get("selected_varieties") or []
    if not region_id or not variety_ids:
        return {"region_id": region_id, "season_start": None, "crops": []}

    season_start = f"{date.today().year}-04-01"

    rows = (
        sb.table("gdd_accumulation")
        .select("tmax,tmin")
        .eq("region_id", region_id)
        .gte("date", season_start)
        .lte("date", date.today().isoformat())
        .execute()
    )
    weather = rows.data or []

    # Variety holds gdd_to_harvest; parent category holds base_temperature.
    varieties_res = (
        sb.table("crop_varieties")
        .select("id,name_uk,gdd_to_harvest,category:crop_categories(base_temperature)")
        .in_("id", variety_ids)
        .execute()
    )

    result = []
    for v in (varieties_res.data or []):
        cat = v.get("category") or {}
        base = float(cat.get("base_temperature") or 10)
        target = int(v.get("gdd_to_harvest") or 0)
        accumulated = sum(
            max(0.0, (r["tmax"] + r["tmin"]) / 2 - base)
            for r in weather
            if r.get("tmax") is not None and r.get("tmin") is not None
        )
        pct = round(min(accumulated / target, 1.0), 3) if target > 0 else 0.0
        result.append({
            "crop_id":          v["id"],          # variety id (matches calendar windows)
            "crop_name":        v["name_uk"],
            "base_temperature": base,
            "gdd_to_harvest":   target,
            "gdd_accumulated":  round(accumulated, 1),
            "pct":              pct,
        })

    return {"region_id": region_id, "season_start": season_start, "crops": result}


@router.post("/gdd/run", status_code=200)
async def trigger_gdd_job(_: dict = Depends(get_current_user)):
    """Manually trigger the GDD job (for testing). Runs synchronously."""
    from app.scheduler import run_gdd_job
    run_gdd_job()
    return {"status": "ok"}
