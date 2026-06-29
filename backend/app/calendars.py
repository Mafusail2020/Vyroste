"""
Multiple calendars per user.

Each calendar owns its own region anchor + variety selection, so a user can
keep e.g. «Дача» (Полісся, 12 crops) and «Балкон» (Київ, 4 herbs) side by side.

The service-key Supabase client bypasses RLS, so every handler filters by
user_id explicitly — RLS in migration 006 is defense-in-depth.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.calendar import compute_windows_for
from app.deps import get_supabase

router = APIRouter(prefix="/calendars")

# Calendar type → allowed crop-category types. 'mixed' allows everything.
TYPE_ALLOWED: dict[str, set[str]] = {
    "horod": {"vegetable", "herb"},
    "sad":   {"berry", "tree"},
    "kviti": {"flower"},
}


class CalendarCreate(BaseModel):
    name: str = "Мій календар"
    region_id: str | None = None
    calendar_type: str = "mixed"
    selected_varieties: list[str] = []


class CalendarUpdate(BaseModel):
    name: str | None = None
    region_id: str | None = None
    calendar_type: str | None = None
    selected_varieties: list[str] | None = None


def _own_calendar(sb, calendar_id: str, user_id: str) -> dict:
    """Fetch a calendar and assert ownership, or 404."""
    res = (
        sb.table("calendars")
        .select("*")
        .eq("id", calendar_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Calendar not found")
    return res.data


def _with_meta(sb, cal: dict) -> dict:
    """Attach region_name + variety_count for list/detail responses."""
    region_name = None
    if cal.get("region_id"):
        r = (
            sb.table("climate_zones")
            .select("region")
            .eq("id", cal["region_id"])
            .maybe_single()
            .execute()
        )
        region_name = (r.data or {}).get("region")
    return {
        **cal,
        "region_name": region_name,
        "variety_count": len(cal.get("selected_varieties") or []),
    }


@router.get("")
async def list_calendars(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("calendars")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at")
        .execute()
    )
    return [_with_meta(sb, c) for c in (res.data or [])]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_calendar(body: CalendarCreate, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = sb.table("calendars").insert({
        "user_id": current_user["id"],
        "name": body.name.strip() or "Мій календар",
        "region_id": body.region_id,
        "calendar_type": body.calendar_type if body.calendar_type in {"horod", "sad", "kviti", "mixed"} else "mixed",
        "selected_varieties": body.selected_varieties,
    }).execute()
    return _with_meta(sb, res.data[0])


@router.patch("/{calendar_id}")
async def update_calendar(
    calendar_id: str, body: CalendarUpdate, current_user: dict = Depends(get_current_user)
):
    sb = get_supabase()
    _own_calendar(sb, calendar_id, current_user["id"])

    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "name" in patch:
        patch["name"] = patch["name"].strip() or "Мій календар"
    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Nothing to update")

    res = sb.table("calendars").update(patch).eq("id", calendar_id).execute()
    return _with_meta(sb, res.data[0])


@router.delete("/{calendar_id}", status_code=status.HTTP_200_OK)
async def delete_calendar(calendar_id: str, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    _own_calendar(sb, calendar_id, current_user["id"])
    sb.table("calendars").delete().eq("id", calendar_id).execute()
    return {"deleted": calendar_id}


@router.post("/{calendar_id}/varieties/{variety_id}")
async def add_variety(
    calendar_id: str, variety_id: str, current_user: dict = Depends(get_current_user)
):
    sb = get_supabase()
    cal = _own_calendar(sb, calendar_id, current_user["id"])

    # Enforce calendar type: the variety's category must be an allowed kind.
    allowed = TYPE_ALLOWED.get(cal.get("calendar_type") or "mixed")
    if allowed is not None:
        v = (
            sb.table("crop_varieties")
            .select("category:crop_categories(type)")
            .eq("id", variety_id)
            .maybe_single()
            .execute()
        )
        cat_type = ((v.data or {}).get("category") or {}).get("type")
        if cat_type and cat_type not in allowed:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Цей тип календаря не приймає культури типу «{cat_type}»",
            )

    varieties = cal.get("selected_varieties") or []
    if variety_id not in varieties:
        varieties = [*varieties, variety_id]
        sb.table("calendars").update({"selected_varieties": varieties}).eq("id", calendar_id).execute()
    return {"selected_varieties": varieties}


@router.delete("/{calendar_id}/varieties/{variety_id}")
async def remove_variety(
    calendar_id: str, variety_id: str, current_user: dict = Depends(get_current_user)
):
    sb = get_supabase()
    cal = _own_calendar(sb, calendar_id, current_user["id"])
    varieties = [v for v in (cal.get("selected_varieties") or []) if v != variety_id]
    sb.table("calendars").update({"selected_varieties": varieties}).eq("id", calendar_id).execute()
    return {"selected_varieties": varieties}


@router.get("/{calendar_id}/windows")
async def calendar_windows(calendar_id: str, current_user: dict = Depends(get_current_user)):
    """Flat CropWindow[] for this calendar's region + varieties."""
    sb = get_supabase()
    cal = _own_calendar(sb, calendar_id, current_user["id"])

    variety_ids = cal.get("selected_varieties") or []
    return compute_windows_for(sb, cal.get("region_id"), variety_ids)
