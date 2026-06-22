from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter()


@router.get("/regions")
async def get_regions():
    result = get_supabase().table("climate_zones").select("*").order("region").execute()
    return result.data


def _flatten_variety(v: dict) -> dict:
    """Map a variety (+ embedded category) to the legacy flat `crop` shape the
    onboarding / add-crop pickers consume. `id` is the variety id; offsets in
    days are surfaced back as the old week-based fields."""
    cat = v.get("category") or {}
    sow = v.get("seedling_sow_start_offset")
    transplant = v.get("transplant_start_offset")
    direct = v.get("direct_sow_start_offset")
    ground_offset = transplant if transplant is not None else direct
    return {
        "id": v["id"],
        "name_uk": v["name_uk"],
        "name_lat": cat.get("name_lat"),
        "type": cat.get("type", "vegetable"),
        # weeks BEFORE last frost to start indoors (None = direct sow)
        "seedling_start_week": round(-sow / 7) if sow is not None else None,
        # weeks relative to last frost (+after / -before)
        "ground_planting_week": round(ground_offset / 7) if ground_offset is not None else 0,
        "days_to_harvest": v.get("days_to_harvest") or 90,
        "lunar_preference": cat.get("lunar_preference", "any"),
    }


@router.get("/crops")
async def get_crops():
    """Varieties flattened to the legacy crop shape, ordered by name."""
    result = (
        get_supabase()
        .table("crop_varieties")
        .select("*, category:crop_categories(*)")
        .order("name_uk")
        .execute()
    )
    return [_flatten_variety(v) for v in (result.data or [])]


@router.get("/categories")
async def get_categories():
    """Categories with their nested varieties (one-to-many) for richer pickers."""
    result = (
        get_supabase()
        .table("crop_categories")
        .select("*, varieties:crop_varieties(*)")
        .order("name_uk")
        .execute()
    )
    return result.data


class OnboardingRequest(BaseModel):
    region_id: str
    plot_type: str
    selected_crops: list[str] = []   # variety ids


@router.patch("/users/me/onboarding", status_code=status.HTTP_200_OK)
async def save_onboarding(
    body: OnboardingRequest,
    current_user: dict = Depends(get_current_user),
):
    allowed_plot_types = {"balcony", "dacha", "garden"}
    if body.plot_type not in allowed_plot_types:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid plot_type")

    user_id = current_user["id"]
    sb = get_supabase()

    result = sb.table("user_profiles").upsert({
        "id": user_id,
        "region_id": body.region_id,
        "plot_type": body.plot_type,
        "selected_varieties": body.selected_crops,
        "onboarding_completed": True,
    }).execute()

    # Ensure a default calendar exists (create on first onboarding, else sync
    # the user's earliest calendar so the flow lands on a populated calendar).
    existing = (
        sb.table("calendars").select("id").eq("user_id", user_id).order("created_at").limit(1).execute()
    )
    if existing.data:
        sb.table("calendars").update({
            "region_id": body.region_id,
            "selected_varieties": body.selected_crops,
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        sb.table("calendars").insert({
            "user_id": user_id,
            "name": "Мій календар",
            "region_id": body.region_id,
            "selected_varieties": body.selected_crops,
        }).execute()

    return result.data[0]
