from datetime import date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.deps import get_supabase
from app.weather import fetch_yesterday_temps

_BASE_TEMP = 10.0  # stored gdd_daily uses 10°C base; per-crop base used at query time
_ALERT_THRESHOLD = 0.8  # 80% of gdd_to_harvest triggers email


def _send_gdd_alerts() -> None:
    """Check GDD thresholds for all premium users and send harvest-approaching emails."""
    from app.email import send_gdd_alert

    sb = get_supabase()
    year = date.today().year
    season_start = f"{year}-04-01"

    # Premium users with a region configured
    profiles_res = (
        sb.table("user_profiles")
        .select("id,region_id,selected_crops")
        .eq("is_premium", True)
        .not_.is_("region_id", "null")
        .not_.is_("selected_crops", "null")
        .execute()
    )
    profiles = profiles_res.data or []
    if not profiles:
        return

    # Build email map from Supabase Auth admin API
    try:
        all_users = sb.auth.admin.list_users()
        email_map: dict[str, str] = {u.id: (u.email or "") for u in all_users}
    except Exception:
        return

    # Collect all unique crop IDs across users
    all_crop_ids: list[str] = list({c for p in profiles for c in (p.get("selected_crops") or [])})
    if not all_crop_ids:
        return

    crops_res = (
        sb.table("crops")
        .select("id,name_uk,base_temperature,gdd_to_harvest")
        .in_("id", all_crop_ids)
        .execute()
    )
    crop_map: dict[str, dict] = {c["id"]: c for c in (crops_res.data or [])}

    # GDD rows for all relevant regions since season start
    all_region_ids: list[str] = list({p["region_id"] for p in profiles if p.get("region_id")})
    gdd_res = (
        sb.table("gdd_accumulation")
        .select("region_id,tmax,tmin")
        .in_("region_id", all_region_ids)
        .gte("date", season_start)
        .lte("date", date.today().isoformat())
        .execute()
    )
    region_weather: dict[str, list[dict]] = {}
    for row in (gdd_res.data or []):
        region_weather.setdefault(row["region_id"], []).append(row)

    # Already-sent alerts this season
    sent_res = (
        sb.table("gdd_alerts_sent")
        .select("user_id,crop_id")
        .eq("season_year", year)
        .execute()
    )
    sent_set: set[tuple[str, str]] = {(r["user_id"], r["crop_id"]) for r in (sent_res.data or [])}

    for profile in profiles:
        user_id: str = profile["id"]
        region_id: str | None = profile.get("region_id")
        crops: list[str] = profile.get("selected_crops") or []
        email = email_map.get(user_id, "")
        if not email or not region_id:
            continue

        weather = region_weather.get(region_id, [])
        if not weather:
            continue

        for crop_id in crops:
            if (user_id, crop_id) in sent_set:
                continue
            crop = crop_map.get(crop_id)
            if not crop:
                continue
            base = float(crop.get("base_temperature") or 10)
            target = int(crop.get("gdd_to_harvest") or 0)
            if target == 0:
                continue

            accumulated = sum(
                max(0.0, (r["tmax"] + r["tmin"]) / 2 - base)
                for r in weather
                if r.get("tmax") is not None and r.get("tmin") is not None
            )

            if accumulated / target >= _ALERT_THRESHOLD:
                try:
                    send_gdd_alert(email, crop["name_uk"], accumulated / target)
                    sb.table("gdd_alerts_sent").insert({
                        "user_id":     user_id,
                        "region_id":   region_id,
                        "crop_id":     crop_id,
                        "season_year": year,
                    }).execute()
                    sent_set.add((user_id, crop_id))
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


scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(run_gdd_job, "cron", hour=8, minute=0, id="gdd_daily", replace_existing=True)
