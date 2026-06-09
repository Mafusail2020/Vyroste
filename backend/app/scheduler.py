from datetime import date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.deps import get_supabase
from app.weather import fetch_yesterday_temps

_BASE_TEMP = 10.0  # stored gdd_daily uses 10°C base; per-crop base used at query time


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


scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(run_gdd_job, "cron", hour=8, minute=0, id="gdd_daily", replace_existing=True)
