"""
Seed crop_categories + crop_varieties from the planting-calendar CSV.

The CSV gives ABSOLUTE dates per (culture, agro-zone). We reverse them into
FROST-RELATIVE offsets (days) so the calendar endpoint can recompute dates for
any region from its avg_last_frost_date.

How the frost anchor is derived (fully data-driven, no external constants):
  frost[zone] = Томат transplant-start[zone]   (warm-crop transplant ≈ last frost)
Each offset = csv_date - frost[zone]; offsets are then averaged across the 4
zones, collapsing the 4 rows of a culture into ONE variety.

Variety naming: the CSV has no Сорт column, so each culture gets a single
variety whose name defaults to the culture name (e.g. Томат → «Томат»).

Run from backend/:
    python scripts/seed_crop_varieties.py --dry-run    # parse + preview, no writes
    python scripts/seed_crop_varieties.py              # upsert into Supabase

Requires migration 005_crop_categories_varieties.sql applied first.
"""
from __future__ import annotations

import csv
import glob
import os
import statistics
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REF_YEAR = 2026

# UK month abbreviations → month number.
MONTHS = {
    "січ": 1, "лют": 2, "берез": 3, "квіт": 4, "трав": 5, "черв": 6,
    "лип": 7, "серп": 8, "вер": 9, "верес": 9, "жовт": 10, "лист": 11, "груд": 12,
}

EMPTY = {"—", "-", "", "–"}                      # em-dash = "not applicable"
DASHES = ("–", "—", "-")                          # range separators

# Овоч / Квітка → model crop type.
TYPE_MAP = {"Овоч": "vegetable", "Квітка": "flower"}

# True average last-frost per CSV agro-zone (month, day). Offsets are computed
# relative to THIS anchor, so they line up with the real per-oblast frost dates
# stored in climate_zones.avg_last_frost_date (south earlier, mountains latest).
AGRO_ZONE_FROST = {
    "Степ":     (4, 10),
    "Лісостеп": (4, 22),
    "Полісся":  (5, 1),
    "Карпати":  (5, 12),
}

# Not in the CSV — sensible per-culture constants (base GDD temp, lunar pref,
# gdd/days to harvest). Unknown cultures fall back to FALLBACK.
FALLBACK = {"base_temperature": 8.0, "lunar_preference": "above_ground",
            "gdd_to_harvest": None, "days_to_harvest": None}
KNOWN: dict[str, dict] = {
    "Томат":            {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 1100, "days_to_harvest": 70},
    "Перець солодкий":  {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 1300, "days_to_harvest": 80},
    "Баклажан":         {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 1300, "days_to_harvest": 75},
    "Огірок":           {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 800,  "days_to_harvest": 55},
    "Кабачок":          {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 700,  "days_to_harvest": 50},
    "Гарбуз":           {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 1000, "days_to_harvest": 95},
    "Капуста рання":    {"base_temperature": 5.0,  "lunar_preference": "above_ground", "gdd_to_harvest": 900,  "days_to_harvest": 90},
    "Капуста пізня":    {"base_temperature": 5.0,  "lunar_preference": "above_ground", "gdd_to_harvest": 1200, "days_to_harvest": 130},
    "Морква":           {"base_temperature": 5.0,  "lunar_preference": "below_ground", "gdd_to_harvest": 900,  "days_to_harvest": 80},
    "Буряк столовий":   {"base_temperature": 5.0,  "lunar_preference": "below_ground", "gdd_to_harvest": 800,  "days_to_harvest": 75},
    "Салат листовий":   {"base_temperature": 2.0,  "lunar_preference": "above_ground", "gdd_to_harvest": 500,  "days_to_harvest": 45},
    "Цибуля-сіянець":   {"base_temperature": 5.0,  "lunar_preference": "below_ground", "gdd_to_harvest": 700,  "days_to_harvest": 100},
    "Часник озимий":    {"base_temperature": 2.0,  "lunar_preference": "below_ground", "gdd_to_harvest": 600,  "days_to_harvest": 270},
    "Квасоля":          {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 700,  "days_to_harvest": 65},
    "Горох":            {"base_temperature": 5.0,  "lunar_preference": "above_ground", "gdd_to_harvest": 600,  "days_to_harvest": 60},
    "Чорнобривці":      {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 800,  "days_to_harvest": 70},
    "Петунія":          {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 900,  "days_to_harvest": 80},
    "Настурція":        {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 600,  "days_to_harvest": 55},
    "Астра однорічна":  {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 800,  "days_to_harvest": 90},
    "Гвоздика Шабо":    {"base_temperature": 10.0, "lunar_preference": "above_ground", "gdd_to_harvest": 1000, "days_to_harvest": 110},
}

# Column indices in the CSV.
C_CULTURE, C_TYPE, C_ZONE = 0, 1, 2
C_SOW_START, C_SOW_END, C_PRICK, C_HARDEN = 3, 4, 5, 6
C_TRANS_START, C_TRANS_END, C_DIRECT = 7, 8, 9
C_NOTES = 12


def _parse_one(token: str, fallback_month: int | None = None) -> date | None:
    """'1 берез.' → date(REF_YEAR, 3, 1). Returns None for empty cells.
    `fallback_month` lets the left side of '5–20 квіт.' inherit the month."""
    token = token.strip().replace("(осінь)", "").strip().rstrip(".")
    if token in EMPTY or not token:
        return None
    parts = token.split()
    day = int(parts[0])
    month = fallback_month
    if len(parts) > 1:
        key = parts[1].rstrip(".")
        month = MONTHS.get(key, MONTHS.get(key[:5], MONTHS.get(key[:4])))
    if month is None:
        return None
    return date(REF_YEAR, month, day)


def _parse_range(cell: str) -> tuple[date | None, date | None]:
    """Split a range cell ('15 квіт. – 10 трав.' or '5–20 квіт.') into start/end.
    A single date returns (d, None). Empty returns (None, None)."""
    cell = cell.strip()
    if cell in EMPTY or not cell:
        return None, None
    sep = next((d for d in DASHES if d in cell.replace("—", "–") and _looks_range(cell, d)), None)
    if sep is None:
        return _parse_one(cell), None
    left, right = cell.replace("—", "–").split("–", 1)
    end = _parse_one(right)
    start = _parse_one(left, fallback_month=end.month if end else None)
    return start, end


def _looks_range(cell: str, dash: str) -> bool:
    """True when the dash separates two day/date tokens (not a leading em-dash)."""
    norm = cell.replace("—", "–")
    return "–" in norm and any(ch.isdigit() for ch in norm.split("–")[0])


def _prick_weeks(cell: str) -> int | None:
    cell = cell.strip()
    if cell in EMPTY:
        return None
    nums = [int(p) for p in cell.replace("—", "–").split("–") if p.strip().isdigit()]
    return round(statistics.mean(nums)) if nums else None


def _offset(d: date | None, frost: date) -> int | None:
    return (d - frost).days if d else None


def _mean_int(vals: list[int]) -> int | None:
    vals = [v for v in vals if v is not None]
    return round(statistics.mean(vals)) if vals else None


def build_catalog(rows: list[list[str]]) -> list[dict]:
    # 1. True last-frost anchor per agro-zone (matches climate_zones frost dates).
    frost: dict[str, date] = {
        zone: date(REF_YEAR, m, d) for zone, (m, d) in AGRO_ZONE_FROST.items()
    }

    # 2. Per culture, collect frost-relative offsets across all zones.
    cultures: dict[str, dict] = {}
    for r in rows:
        culture, zone = r[C_CULTURE], r[C_ZONE]
        if zone not in frost:
            continue
        f = frost[zone]
        acc = cultures.setdefault(culture, {
            "type": TYPE_MAP.get(r[C_TYPE], "vegetable"),
            "notes": r[C_NOTES].strip() or None,
            "sow_start": [], "sow_end": [], "prick": [], "harden": [],
            "trans_start": [], "trans_end": [], "direct_start": [], "direct_end": [],
        })
        acc["sow_start"].append(_offset(_parse_one(r[C_SOW_START]), f))
        acc["sow_end"].append(_offset(_parse_one(r[C_SOW_END]), f))
        acc["harden"].append(_offset(_parse_one(r[C_HARDEN]), f))
        acc["trans_start"].append(_offset(_parse_one(r[C_TRANS_START]), f))
        acc["trans_end"].append(_offset(_parse_one(r[C_TRANS_END]), f))
        d_s, d_e = _parse_range(r[C_DIRECT])
        acc["direct_start"].append(_offset(d_s, f))
        acc["direct_end"].append(_offset(d_e, f))
        p = _prick_weeks(r[C_PRICK])
        if p is not None:
            acc["prick"].append(p)

    # 3. Collapse to one variety per culture.
    out: list[dict] = []
    for culture, acc in cultures.items():
        trans_start = _mean_int(acc["trans_start"])
        direct_start = _mean_int(acc["direct_start"])
        has_seedling = trans_start is not None
        has_direct = direct_start is not None
        method = ("both" if has_seedling and has_direct
                  else "seedling" if has_seedling else "direct")
        meta = KNOWN.get(culture, FALLBACK)
        out.append({
            "category": {
                "name_uk": culture,
                "type": acc["type"],
                "base_temperature": meta["base_temperature"],
                "lunar_preference": meta["lunar_preference"],
            },
            "variety": {
                "name_uk": culture,                       # Сорт defaults to culture name
                "growing_method": method,
                "seedling_sow_start_offset": _mean_int(acc["sow_start"]) if has_seedling else None,
                "seedling_sow_end_offset": _mean_int(acc["sow_end"]) if has_seedling else None,
                "prick_out_weeks_after_sprout": _mean_int(acc["prick"]) if has_seedling else None,
                "hardening_offset": _mean_int(acc["harden"]) if has_seedling else None,
                "transplant_start_offset": trans_start,
                "transplant_end_offset": _mean_int(acc["trans_end"]) if has_seedling else None,
                "direct_sow_start_offset": direct_start,
                "direct_sow_end_offset": _mean_int(acc["direct_end"]) if has_direct else None,
                "days_to_harvest": meta["days_to_harvest"],
                "gdd_to_harvest": meta["gdd_to_harvest"],
                "notes": acc["notes"],
            },
        })
    return out


def find_csv() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    for base in (os.path.join(here, "..", ".."), os.path.join(here, ".."), here):
        hits = glob.glob(os.path.join(base, "*Календар*.csv"))
        if hits:
            return hits[0]
    raise SystemExit("CSV not found (looked for *Календар*.csv near the repo root).")


def main() -> None:
    dry = "--dry-run" in sys.argv
    path = find_csv()
    rows = list(csv.reader(open(path, encoding="utf-8")))[1:]
    catalog = build_catalog(rows)

    if dry:
        for item in catalog:
            c, v = item["category"], item["variety"]
            print(f"\n■ {c['name_uk']} [{c['type']}] base={c['base_temperature']} lunar={c['lunar_preference']}")
            print(f"   variety «{v['name_uk']}» method={v['growing_method']} dth={v['days_to_harvest']}")
            print(f"   sow {v['seedling_sow_start_offset']}..{v['seedling_sow_end_offset']}  "
                  f"harden {v['hardening_offset']}  prick {v['prick_out_weeks_after_sprout']}w  "
                  f"transplant {v['transplant_start_offset']}..{v['transplant_end_offset']}  "
                  f"direct {v['direct_sow_start_offset']}..{v['direct_sow_end_offset']}")
        print(f"\n{len(catalog)} cultures parsed (dry-run, nothing written).")
        return

    from supabase import create_client
    from core.config import settings
    sb = create_client(settings.supabase_url, settings.supabase_service_key)

    existing = sb.table("crop_categories").select("name_uk").execute()
    have = {r["name_uk"] for r in (existing.data or [])}

    inserted = 0
    for item in catalog:
        if item["category"]["name_uk"] in have:
            continue
        cat = sb.table("crop_categories").insert(item["category"]).execute().data[0]
        variety = {**item["variety"], "category_id": cat["id"]}
        sb.table("crop_varieties").insert(variety).execute()
        inserted += 1
        print(f"  + {cat['name_uk']} → «{variety['name_uk']}» ({variety['growing_method']})")

    print(f"\nInserted {inserted} categories (+1 variety each). "
          f"Skipped {len(catalog) - inserted} already present.")


if __name__ == "__main__":
    main()
