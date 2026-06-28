from datetime import date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.calendar import _parse_frost_date
from app.deps import get_supabase
from app.weather import fetch_yesterday_temps

_BASE_TEMP = 10.0  # stored gdd_daily uses 10°C base; per-crop base used at query time
_ALERT_THRESHOLD = 0.8  # 80% of gdd_to_harvest triggers email


def _send_gdd_alerts() -> None:
    """Check GDD thresholds across all premium users' calendars and send
    harvest-approaching emails. Keyed by variety id (gdd_alerts_sent.crop_id)."""
    from app.email import send_gdd_alert

    sb = get_supabase()
    year = date.today().year

    # Premium user ids.
    premium_res = (
        sb.table("user_profiles").select("id").eq("is_premium", True).execute()
    )
    premium_ids = [p["id"] for p in (premium_res.data or [])]
    if not premium_ids:
        return

    # Every calendar belonging to a premium user.
    cals_res = (
        sb.table("calendars")
        .select("user_id,region_id,selected_varieties")
        .in_("user_id", premium_ids)
        .not_.is_("region_id", "null")
        .execute()
    )
    calendars = [c for c in (cals_res.data or []) if c.get("selected_varieties")]
    if not calendars:
        return

    # Build email map from Supabase Auth admin API.
    try:
        all_users = sb.auth.admin.list_users()
        email_map: dict[str, str] = {u.id: (u.email or "") for u in all_users}
    except Exception:
        return

    # Variety meta: gdd_to_harvest + parent base_temperature.
    all_variety_ids = list({v for c in calendars for v in (c.get("selected_varieties") or [])})
    if not all_variety_ids:
        return
    var_res = (
        sb.table("crop_varieties")
        .select("id,name_uk,gdd_to_harvest,category:crop_categories(base_temperature)")
        .in_("id", all_variety_ids)
        .execute()
    )
    variety_map: dict[str, dict] = {v["id"]: v for v in (var_res.data or [])}

    # Per-region season start = the region's avg last-frost date (fallback April 1).
    all_region_ids = list({c["region_id"] for c in calendars if c.get("region_id")})
    region_season: dict[str, str] = {}
    try:
        cz = (
            sb.table("climate_zones").select("id,avg_last_frost_date")
            .in_("id", all_region_ids).execute()
        )
        for z in (cz.data or []):
            frost = z.get("avg_last_frost_date")
            try:
                region_season[z["id"]] = (
                    _parse_frost_date(frost, year).isoformat() if frost else f"{year}-04-01"
                )
            except Exception:
                region_season[z["id"]] = f"{year}-04-01"
    except Exception:
        pass
    for rid in all_region_ids:
        region_season.setdefault(rid, f"{year}-04-01")

    # Fetch from the earliest season across regions, then filter per region below.
    earliest = min(region_season.values()) if region_season else f"{year}-04-01"
    gdd_res = (
        sb.table("gdd_accumulation")
        .select("region_id,tmax,tmin,date")
        .in_("region_id", all_region_ids)
        .gte("date", earliest)
        .lte("date", date.today().isoformat())
        .execute()
    )
    region_weather: dict[str, list[dict]] = {}
    for row in (gdd_res.data or []):
        rid = row["region_id"]
        if row.get("date") and row["date"] >= region_season.get(rid, earliest):
            region_weather.setdefault(rid, []).append(row)

    # Already-sent alerts this season (user_id, variety_id).
    sent_res = (
        sb.table("gdd_alerts_sent").select("user_id,crop_id").eq("season_year", year).execute()
    )
    sent_set: set[tuple[str, str]] = {(r["user_id"], r["crop_id"]) for r in (sent_res.data or [])}

    for cal in calendars:
        user_id: str = cal["user_id"]
        region_id: str | None = cal.get("region_id")
        variety_ids: list[str] = cal.get("selected_varieties") or []
        email = email_map.get(user_id, "")
        if not email or not region_id:
            continue

        weather = region_weather.get(region_id, [])
        if not weather:
            continue

        for variety_id in variety_ids:
            if (user_id, variety_id) in sent_set:
                continue
            v = variety_map.get(variety_id)
            if not v:
                continue
            base = float((v.get("category") or {}).get("base_temperature") or 10)
            target = int(v.get("gdd_to_harvest") or 0)
            if target == 0:
                continue

            accumulated = sum(
                max(0.0, (r["tmax"] + r["tmin"]) / 2 - base)
                for r in weather
                if r.get("tmax") is not None and r.get("tmin") is not None
            )

            if accumulated / target >= _ALERT_THRESHOLD:
                try:
                    send_gdd_alert(email, v["name_uk"], accumulated / target)
                    sb.table("gdd_alerts_sent").insert({
                        "user_id":     user_id,
                        "region_id":   region_id,
                        "crop_id":     variety_id,
                        "season_year": year,
                    }).execute()
                    sent_set.add((user_id, variety_id))
                except Exception:
                    pass


def run_gdd_job() -> None:
    sb = get_supabase()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    season_start = f"{date.today().year}-04-01"

    regions = sb.table("climate_zones").select("id,latitude,longitude").execute()

    for region in (regions.data or []):
        temps = fetch_yesterday_temps(region["latitude"], region["longitude"])
        if temps is None:
            continue

        tmax, tmin = temps
        tmean = (tmax + tmin) / 2
        gdd_daily = max(0.0, tmean - _BASE_TEMP)

        # Compute cumulative for this region since season start
        prev = (
            sb.table("gdd_accumulation")
            .select("gdd_cumulative")
            .eq("region_id", region["id"])
            .gte("date", season_start)
            .lt("date", yesterday)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        prev_cum = float((prev.data[0].get("gdd_cumulative") or 0) if prev.data else 0)

        sb.table("gdd_accumulation").upsert({
            "region_id":      region["id"],
            "date":           yesterday,
            "tmax":           tmax,
            "tmin":           tmin,
            "gdd_daily":      round(gdd_daily, 2),
            "gdd_cumulative": round(prev_cum + gdd_daily, 2),
        }).execute()

    try:
        _send_gdd_alerts()
    except Exception:
        pass


def run_newsletter_job() -> None:
    """Hourly tick: send the weekly newsletter when the configured day/hour (UTC)
    matches and it hasn't already gone out today. Schedule is admin-editable, so
    we poll the settings row rather than hard-wiring a cron day/time."""
    from datetime import datetime, timezone
    from app.newsletter import send_to_audience

    sb = get_supabase()
    res = sb.table("newsletter").select("*").eq("id", 1).maybe_single().execute()
    row = res.data if res else None
    if not row or not row.get("enabled"):
        return

    now = datetime.now(timezone.utc)
    if now.weekday() != int(row.get("send_dow", 0)) or now.hour != int(row.get("send_hour", 9)):
        return

    last = row.get("last_sent_at")
    if last:
        try:
            last_dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
            if (now - last_dt).total_seconds() < 23 * 3600:
                return   # already sent within the last day
        except Exception:
            pass

    try:
        send_to_audience(sb, row)
        sb.table("newsletter").update({"last_sent_at": now.isoformat()}).eq("id", 1).execute()
    except Exception:
        pass


def run_expire_premium_job() -> None:
    """Nightly: revoke Premium from users whose paid term has lapsed.
    Payments set premium_until on purchase; nothing else reads it, so without
    this job is_premium would stay true forever."""
    from datetime import datetime, timezone

    sb = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        sb.table("user_profiles").update({"is_premium": False}) \
            .eq("is_premium", True).lt("premium_until", now_iso).execute()
    except Exception:
        pass


scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(run_gdd_job, "cron", hour=8, minute=0, id="gdd_daily", replace_existing=True)
scheduler.add_job(run_newsletter_job, "cron", minute=5, id="newsletter_weekly", replace_existing=True)
scheduler.add_job(run_expire_premium_job, "cron", hour=3, minute=0, id="expire_premium", replace_existing=True)
