"""
Planting calendar.

CRITICAL: every date is computed dynamically from the user's region
`avg_last_frost_date`. There are NO hardcoded months. A variety stores
frost-relative offsets (in days, negative = before frost); the same variety
yields different absolute dates in Полісся vs Степ purely because the frost
anchor differs.

The pure function `compute_variety_windows` is storage-agnostic (takes plain
dicts) so it works identically against the Supabase client rows here and
against SQLAlchemy model `__dict__`s / tests.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.deps import get_supabase
from app.schemas import (
    CalendarEntry,
    CalendarResponse,
    PlantingPhase,
)

router = APIRouter()

HARVEST_WINDOW_DAYS = 30
FREE_TIER_LIMIT = 5

# Growing-method string constants (mirror app.models.GrowingMethod values).
SEEDLING = "seedling"
DIRECT = "direct"
BOTH = "both"


def _parse_frost_date(frost_str: str, year: int) -> date:
    """'MM-DD' → date in the given year."""
    month, day = (int(p) for p in frost_str.split("-"))
    return date(year, month, day)


def _shift(anchor: date, offset_days: int | None) -> date | None:
    """anchor + offset_days, or None when the offset is absent."""
    if offset_days is None:
        return None
    return anchor + timedelta(days=offset_days)


def _phase(label: str, start: date | None, end: date | None = None) -> PlantingPhase | None:
    """Build a phase only when it has a start; gracefully drops N/A phases."""
    if start is None:
        return None
    return PlantingPhase(label=label, start=start, end=end)


def compute_variety_windows(
    variety: dict,
    category: dict,
    last_frost: date,
    *,
    harvest_window_days: int = HARVEST_WINDOW_DAYS,
) -> CalendarEntry:
    """Compute every applicable window for one variety against `last_frost`.

    Only the phases enabled by `growing_method` are emitted. The harvest
    anchor is the start of whichever ground-entry phase the method uses
    (transplant for seedlings, direct-sow for direct), so harvest math also
    stays frost-relative without any month literals.
    """
    method = variety["growing_method"]
    phases: list[PlantingPhase] = []
    ground_anchor: date | None = None

    # ── Seedling track ──────────────────────────────────────────────────────
    if method in (SEEDLING, BOTH):
        sow = _phase(
            "Посів на розсаду",
            _shift(last_frost, variety.get("seedling_sow_start_offset")),
            _shift(last_frost, variety.get("seedling_sow_end_offset")),
        )
        if sow:
            phases.append(sow)

        hardening = _phase(
            "Загартовування",
            _shift(last_frost, variety.get("hardening_offset")),
        )
        if hardening:
            phases.append(hardening)

        transplant_start = _shift(last_frost, variety.get("transplant_start_offset"))
        transplant = _phase(
            "Пересадка в ґрунт",
            transplant_start,
            _shift(last_frost, variety.get("transplant_end_offset")),
        )
        if transplant:
            phases.append(transplant)
            ground_anchor = transplant_start

    # ── Direct-sow track ────────────────────────────────────────────────────
    if method in (DIRECT, BOTH):
        direct_start = _shift(last_frost, variety.get("direct_sow_start_offset"))
        direct = _phase(
            "Пряма посадка в ґрунт",
            direct_start,
            _shift(last_frost, variety.get("direct_sow_end_offset")),
        )
        if direct:
            phases.append(direct)
            # For BOTH varieties, prefer the seedling transplant anchor if set;
            # otherwise fall back to the direct-sow date.
            if ground_anchor is None:
                ground_anchor = direct_start

    # ── Harvest (anchored to ground entry) ──────────────────────────────────
    harvest: PlantingPhase | None = None
    dth = variety.get("days_to_harvest")
    if ground_anchor is not None and dth is not None:
        h_start = ground_anchor + timedelta(days=dth)
        harvest = PlantingPhase(
            label="Збір врожаю",
            start=h_start,
            end=h_start + timedelta(days=harvest_window_days),
        )

    phases.sort(key=lambda p: p.start)

    return CalendarEntry(
        category_id=category["id"],
        category_name=category["name_uk"],
        type=category["type"],
        variety_id=variety["id"],
        variety_name=variety["name_uk"],
        growing_method=method,
        lunar_preference=category.get("lunar_preference", "any"),
        last_frost_date=last_frost,
        phases=phases,
        harvest=harvest,
    )


# Phase labels emitted by compute_variety_windows (keep in sync).
_SEEDLING_LABEL = "Посів на розсаду"
_TRANSPLANT_LABEL = "Пересадка в ґрунт"
_DIRECT_LABEL = "Пряма посадка в ґрунт"


def flatten_entry(e: CalendarEntry) -> dict:
    """Map a structured CalendarEntry → the flat CropWindow shape the frontend
    calendar grid consumes (crop_id / ground_planting / harvest_start ...).

    Guarantees `ground_planting` and `harvest_*` are non-null so the grid's
    date math never receives a missing anchor.
    """
    by_label = {p.label: p for p in e.phases}
    seedling = by_label.get(_SEEDLING_LABEL)
    transplant = by_label.get(_TRANSPLANT_LABEL)
    direct = by_label.get(_DIRECT_LABEL)

    ground = (transplant or direct)
    ground_start = ground.start if ground else e.last_frost_date

    if e.harvest:
        harvest_start, harvest_end = e.harvest.start, e.harvest.end
    else:  # fallback so the grid always has a harvest band
        harvest_start = ground_start + timedelta(days=90)
        harvest_end = harvest_start + timedelta(days=HARVEST_WINDOW_DAYS)

    return {
        "crop_id": str(e.variety_id),
        "crop_name": e.variety_name,
        "crop_type": e.type.value if hasattr(e.type, "value") else e.type,
        "lunar_preference": e.lunar_preference.value
        if hasattr(e.lunar_preference, "value")
        else e.lunar_preference,
        "direct_sow": (e.growing_method.value if hasattr(e.growing_method, "value")
                       else e.growing_method) == DIRECT,
        "seedling_start": seedling.start.isoformat() if seedling else None,
        "ground_planting": ground_start.isoformat(),
        "harvest_start": harvest_start.isoformat(),
        "harvest_end": (harvest_end or harvest_start).isoformat(),
    }


def compute_windows_for(
    sb, region_id: str | None, variety_ids: list[str], *, year: int | None = None
) -> list[dict]:
    """Shared engine: given a region + variety ids, return flat CropWindow dicts.

    Raises HTTPException if the region/frost data is missing. Returns [] when no
    varieties are selected.
    """
    year = year or date.today().year
    if not variety_ids:
        return []
    if not region_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Calendar has no region")

    region = (
        sb.table("climate_zones")
        .select("id, region, avg_last_frost_date")
        .eq("id", region_id)
        .maybe_single()
        .execute()
    )
    if not region.data or not region.data.get("avg_last_frost_date"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Region frost data missing")

    last_frost = _parse_frost_date(region.data["avg_last_frost_date"], year)

    varieties = (
        sb.table("crop_varieties")
        .select("*, category:crop_categories(*)")
        .in_("id", variety_ids)
        .execute()
    )
    return [
        flatten_entry(compute_variety_windows(v, v["category"], last_frost))
        for v in (varieties.data or [])
        if v.get("category")
    ]


@router.get("/calendar")
async def get_calendar(current_user: dict = Depends(get_current_user)):
    """Legacy endpoint: computes from the user's first calendar (falls back to
    the user_profiles selection). Frontend now prefers /calendars/{id}/windows."""
    sb = get_supabase()
    user_id = current_user["id"]

    cal = (
        sb.table("calendars")
        .select("region_id, selected_varieties")
        .eq("user_id", user_id)
        .order("created_at")
        .limit(1)
        .execute()
    )
    if cal.data:
        region_id = cal.data[0].get("region_id")
        variety_ids = cal.data[0].get("selected_varieties") or []
    else:
        profile = (
            sb.table("user_profiles")
            .select("region_id, selected_varieties, is_premium")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not profile.data or not profile.data.get("region_id"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first")
        region_id = profile.data["region_id"]
        variety_ids = profile.data.get("selected_varieties") or []

    return compute_windows_for(sb, region_id, variety_ids)
