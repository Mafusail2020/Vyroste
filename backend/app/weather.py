from datetime import date, timedelta
import httpx


def fetch_yesterday_temps(lat: float, lon: float) -> tuple[float, float] | None:
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    try:
        with httpx.Client(timeout=20) as client:
            r = client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude":      lat,
                    "longitude":     lon,
                    "daily":         ["temperature_2m_max", "temperature_2m_min"],
                    "start_date":    yesterday,
                    "end_date":      yesterday,
                    "past_days":     1,
                    "forecast_days": 0,
                    "timezone":      "Europe/Kiev",
                },
            )
            r.raise_for_status()
            daily = r.json().get("daily", {})
            tmax_l = daily.get("temperature_2m_max", [])
            tmin_l = daily.get("temperature_2m_min", [])
            if tmax_l and tmin_l and tmax_l[0] is not None and tmin_l[0] is not None:
                return float(tmax_l[0]), float(tmin_l[0])
    except Exception:
        pass
    return None
