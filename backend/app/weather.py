from datetime import date, timedelta
import httpx


def fetch_forecast(lat: float, lon: float, days: int = 5) -> list[dict]:
    """Next `days` daily forecast rows: date, tmax, tmin, precip_mm, precip_prob.

    Used by AI Агроном to time treatment around real upcoming rain. Returns []
    on any failure (feature degrades gracefully to region/GDD context only).
    """
    try:
        with httpx.Client(timeout=20) as client:
            r = client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude":      lat,
                    "longitude":     lon,
                    "daily":         [
                        "temperature_2m_max", "temperature_2m_min",
                        "precipitation_sum", "precipitation_probability_max",
                    ],
                    "forecast_days": days,
                    "timezone":      "Europe/Kiev",
                },
            )
            r.raise_for_status()
            d = r.json().get("daily", {})
            dates = d.get("time", [])
            tmax = d.get("temperature_2m_max", [])
            tmin = d.get("temperature_2m_min", [])
            psum = d.get("precipitation_sum", [])
            pprob = d.get("precipitation_probability_max", [])
            out = []
            for i, day in enumerate(dates):
                out.append({
                    "date":        day,
                    "tmax":        tmax[i] if i < len(tmax) else None,
                    "tmin":        tmin[i] if i < len(tmin) else None,
                    "precip_mm":   psum[i] if i < len(psum) else None,
                    "precip_prob": pprob[i] if i < len(pprob) else None,
                })
            return out
    except Exception:
        return []


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
