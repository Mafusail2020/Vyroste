from datetime import date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
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
    season_start = f"{year}-04-01"

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

    # Weather per region since season start.
    all_region_ids = list({c["region_id"] for c in calendars if c.get("region_id")})
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


scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(run_gdd_job, "cron", hour=8, minute=0, id="gdd_daily", replace_existing=True)
