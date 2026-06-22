"""
Pydantic v2 schemas for the planting-calendar API.

Two layers:
  * Catalog schemas  — shape of categories/varieties for the picker UI.
  * Calendar schemas — the computed, frost-anchored planting windows.
"""
from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.enums import CropType, GrowingMethod, LunarPreference


# ── Catalog (read) ──────────────────────────────────────────────────────────
class VarietyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name_uk: str
    growing_method: GrowingMethod
    days_to_harvest: int | None = None
    gdd_to_harvest: int | None = None
    notes: str | None = None


class CategoryOut(BaseModel):
    """Category with its nested varieties (one-to-many)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name_uk: str
    name_lat: str | None = None
    type: CropType
    base_temperature: float
    lunar_preference: LunarPreference
    varieties: list[VarietyOut] = []


# ── Calendar (computed) ─────────────────────────────────────────────────────
class PlantingPhase(BaseModel):
    """A single named window in the season. `end` is optional for point events
    (e.g. hardening start)."""
    label: str            # "Посів на розсаду", "Пересадка в ґрунт", ...
    start: date
    end: date | None = None


class CalendarEntry(BaseModel):
    """All computed windows for one selected variety in the user's region.

    Only the phases that apply to the variety's growing method are present,
    so a direct-sow variety simply omits the seedling/transplant phases.
    """
    category_id: UUID
    category_name: str
    type: CropType
    variety_id: UUID
    variety_name: str
    growing_method: GrowingMethod
    lunar_preference: LunarPreference

    # Frost anchor echoed back so the client can render the reference line.
    last_frost_date: date

    phases: list[PlantingPhase]
    harvest: PlantingPhase | None = None


class CalendarResponse(BaseModel):
    region_id: UUID
    region_name: str
    year: int
    entries: list[CalendarEntry]
