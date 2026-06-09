from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter()

HARVEST_WINDOW_DAYS = 30


def _parse_frost_date(frost_str: str, year: int) -> date:
    """Parse 'MM-DD' frost date string into a date for given year."""
    month, day = (int(p) for p in frost_str.split("-"))
    return date(year, month, day)


def _compute_window(crop: dict, last_frost: date) -> dict:
    gp_weeks = crop.get("ground_planting_week") or 0
    ground_planting = last_frost + timedelta(weeks=gp_weeks)

    seedling_start = None
    sw = crop.get("seedling_start_week")
    if sw is not None:
        seedling_start = last_frost - timedelta(weeks=sw)

    dth = crop.get("days_to_harvest") or 90
    harvest_start = ground_planting + timedelta(days=dth)
    harvest_end = harvest_start + timedelta(days=HARVEST_WINDOW_DAYS)

    return {
        "crop_id": crop["id"],
        "crop_name": crop["name_uk"],
        "crop_type": crop["type"],
        "lunar_preference": crop.get("lunar_preference"),
        "direct_sow": sw is None,
        "seedling_start": seedling_start.isoformat() if seedling_start else None,
        "ground_planting": ground_planting.isoformat(),
        "harvest_start": harvest_start.isoformat(),
        "harvest_end": harvest_end.isoformat(),
    }


@router.get("/calendar")
async def get_calendar(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    user_id = current_user["id"]

    profile = sb.table("user_profiles").select("region_id, selected_crops").eq("id", user_id).maybe_single().execute()
    if not profile.data or not profile.data.get("region_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first")

    region_id = profile.data["region_id"]
    selected_crop_ids: list[str] = profile.data.get("selected_crops") or []

    if not selected_crop_ids:
        return []

    region = sb.table("climate_zones").select("avg_last_frost_date").eq("id", region_id).maybe_single().execute()
    if not region.data or not region.data.get("avg_last_frost_date"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region frost data missing")

    year = date.today().year
    last_frost = _parse_frost_date(region.data["avg_last_frost_date"], year)

    crops = sb.table("crops").select("*").in_("id", selected_crop_ids).execute()

    return [_compute_window(crop, last_frost) for crop in crops.data]
