"""
AI Агроном — photo plant diagnosis.

User uploads a plant photo; Claude vision identifies the plant and any
disease/pest/deficiency, and returns treatment timed to the user's garden
context (region, last-frost date, season GDD, planted varieties) — the data
moat that makes the advice specific where a generic chatbot can't be.

Key-gated: if ANTHROPIC_API_KEY is unset, /diagnose returns 503 (same pattern
as WayForPay checkout). The Supabase service-key client bypasses RLS; handlers
filter by user_id explicitly.
"""
import base64
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.auth import get_current_user
from app.deps import get_supabase
from app.gdd import _resolve_calendar
from app.weather import fetch_forecast
from core.config import settings

router = APIRouter(prefix="/diagnose")

IMAGE_BUCKET = "plant-scans"
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
_ALLOWED_MEDIA = {"image/jpeg", "image/png", "image/webp", "image/gif"}

_TOOL = {
    "name": "report_diagnosis",
    "description": "Структурований звіт діагностики рослини.",
    "input_schema": {
        "type": "object",
        "properties": {
            "crop":       {"type": "string",  "description": "Яка це рослина, українською"},
            "diagnosis":  {"type": "string",  "description": "Коротка назва проблеми, або «Здорова рослина»"},
            "confidence": {"type": "integer", "description": "Впевненість у діагнозі, 0-100"},
            "severity":   {"type": "string",  "enum": ["healthy", "low", "medium", "high"]},
            "is_healthy": {"type": "boolean", "description": "true, якщо рослина здорова"},
            "steps":      {"type": "array", "items": {"type": "string"},
                           "description": "Покрокові дії лікування, по одній на крок"},
            "timing":     {"type": "string", "description": "Коли діяти — прив'яжи до регіону/погоди/GDD з контексту"},
            "prevention": {"type": "string", "description": "Як запобігти проблемі надалі"},
        },
        "required": ["crop", "diagnosis", "confidence", "severity", "is_healthy", "steps", "timing", "prevention"],
    },
}

_SYSTEM = (
    "Ти досвідчений агроном-діагност. За фото рослини визначаєш хворобу, шкідника "
    "або дефіцит живлення. Відповідай українською, простою мовою, щоб зрозуміла навіть "
    "бабуся без агрономічної освіти. Обов'язково враховуй наданий контекст саду "
    "(регіон, заморозки, накопичену суму температур GDD, прогноз погоди, які культури вирощує "
    "користувач) і прив'язуй поради та терміни обробки саме до нього. Якщо радиш обприскування — "
    "ОБОВ'ЯЗКОВО врахуй прогноз опадів: не признач обробку контактними засобами перед дощем, "
    "назви конкретний день/вікно («обробіть сьогодні-завтра, до дощу в …»). Якщо рослина здорова — "
    "скажи прямо. Завжди викликай інструмент report_diagnosis."
)


def _garden_context(sb, user_id: str, calendar_id: str | None) -> tuple[str, str]:
    """(prompt_text, banner_text). Degrades gracefully when no calendar/region."""
    today = date.today()
    lines = [f"Сьогодні: {today.isoformat()}."]

    cal = _resolve_calendar(sb, user_id, calendar_id)
    if not cal or not cal.get("region_id"):
        lines.append("Регіон користувача невідомий — дай загальні поради для України.")
        return "\n".join(lines), "Загальні поради (регіон не вказано)"

    region_id = cal["region_id"]
    z = (
        sb.table("climate_zones")
        .select("region,avg_last_frost_date,latitude,longitude")
        .eq("id", region_id)
        .maybe_single()
        .execute()
        .data
        or {}
    )
    region = z.get("region") or "Україна"
    banner_bits = [region]
    lines.append(f"Регіон: {region}.")

    frost = z.get("avg_last_frost_date")  # "MM-DD"
    if frost and "-" in frost:
        try:
            mm, dd = frost.split("-")
            fdate = date(today.year, int(mm), int(dd))
            delta = (today - fdate).days
            if delta >= 0:
                lines.append(f"Середні останні весняні заморозки ({fdate.isoformat()}) минули {delta} дн. тому.")
                banner_bits.append(f"заморозки минули {delta} дн.")
            else:
                lines.append(f"Середні останні весняні заморозки очікуються через {-delta} дн. ({fdate.isoformat()}).")
                banner_bits.append(f"до заморозків {-delta} дн.")
        except ValueError:
            pass

    season_start = f"{today.year}-04-01"
    rows = (
        sb.table("gdd_accumulation")
        .select("tmax,tmin")
        .eq("region_id", region_id)
        .gte("date", season_start)
        .lte("date", today.isoformat())
        .execute()
        .data
        or []
    )
    if rows:
        gdd = round(sum(
            max(0.0, (r["tmax"] + r["tmin"]) / 2 - 10)
            for r in rows if r.get("tmax") is not None and r.get("tmin") is not None
        ))
        lines.append(f"Накопичена сума активних температур (GDD, база 10°C) з 1 квітня: ≈{gdd}.")
        banner_bits.append(f"GDD ≈{gdd}")

    # Live forecast → real spray-window timing (the thing a generic chatbot can't do).
    lat, lon = z.get("latitude"), z.get("longitude")
    if lat is not None and lon is not None:
        fc = fetch_forecast(float(lat), float(lon), days=5)
        if fc:
            fc_lines = []
            rain_in = None
            for i, d in enumerate(fc):
                mm = d.get("precip_mm")
                prob = d.get("precip_prob")
                wet = (mm is not None and mm >= 1) or (prob is not None and prob >= 50)
                if wet and rain_in is None:
                    rain_in = i
                fc_lines.append(
                    f"  {d['date']}: {d.get('tmin')}…{d.get('tmax')}°C, "
                    f"опади {mm if mm is not None else '?'} мм ({prob if prob is not None else '?'}%)"
                )
            lines.append("Прогноз погоди на наступні дні (для вибору вікна обробки):\n" + "\n".join(fc_lines))
            if rain_in == 0:
                lines.append("Сьогодні очікується дощ — обприскування контактними засобами краще відкласти.")
                banner_bits.append("сьогодні дощ")
            elif rain_in is not None:
                lines.append(f"Дощ очікується через {rain_in} дн. — встигніть обробити до нього (сухе вікно).")
                banner_bits.append(f"дощ через {rain_in} дн.")
            else:
                lines.append("Найближчі ~5 днів без істотних опадів — вікно для обробки відкрите.")
                banner_bits.append("сухо ≥5 дн.")

    variety_ids = cal.get("selected_varieties") or []
    if variety_ids:
        vr = (
            sb.table("crop_varieties").select("name_uk")
            .in_("id", variety_ids[:20]).execute().data or []
        )
        names = [v["name_uk"] for v in vr if v.get("name_uk")]
        if names:
            lines.append("Користувач вирощує: " + ", ".join(names) + ".")

    return "\n".join(lines), " · ".join(banner_bits)


@router.post("")
async def diagnose(
    file: UploadFile = File(...),
    calendar_id: str | None = Form(None),
    crop: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
):
    if not settings.anthropic_api_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI ще не налаштовано — встановіть ANTHROPIC_API_KEY у backend/.env",
        )

    media_type = (file.content_type or "").lower()
    if media_type not in _ALLOWED_MEDIA:
        raise HTTPException(400, "Підтримуються лише зображення (JPEG, PNG, WEBP, GIF)")
    blob = await file.read()
    if len(blob) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Зображення завелике (макс. 5 МБ)")

    sb = get_supabase()

    # 1) Store the photo (public URL for the result card + history).
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    path = f"{current_user['id']}/{uuid.uuid4().hex}.{ext}"
    image_url = None
    try:
        sb.storage.from_(IMAGE_BUCKET).upload(path, blob, {"content-type": media_type, "upsert": "false"})
        image_url = sb.storage.from_(IMAGE_BUCKET).get_public_url(path)
    except Exception:
        image_url = None  # don't fail the diagnosis if storage hiccups

    # 2) Build garden context + call Claude vision (forced tool output).
    ctx_text, banner = _garden_context(sb, current_user["id"], calendar_id)
    hint = f"Підказка від користувача — це «{crop.strip()}». " if crop and crop.strip() else ""

    from anthropic import Anthropic
    client = Anthropic(api_key=settings.anthropic_api_key)
    try:
        msg = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=_SYSTEM,
            tools=[_TOOL],
            tool_choice={"type": "tool", "name": "report_diagnosis"},
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type,
                                                  "data": base64.b64encode(blob).decode()}},
                    {"type": "text", "text": f"Контекст саду:\n{ctx_text}\n\n{hint}Діагностуй цю рослину."},
                ],
            }],
        )
    except Exception as e:
        raise HTTPException(502, f"AI помилка: {e}")

    data = next((b.input for b in msg.content if getattr(b, "type", None) == "tool_use"), None)
    if not data:
        raise HTTPException(502, "AI не повернув результат")

    row = {
        "user_id":         current_user["id"],
        "image_url":       image_url,
        "crop":            (data.get("crop") or "")[:200],
        "diagnosis":       (data.get("diagnosis") or "")[:300],
        "confidence":      max(0, min(100, int(data.get("confidence") or 0))),
        "severity":        data.get("severity") if data.get("severity") in {"healthy", "low", "medium", "high"} else "low",
        "is_healthy":      bool(data.get("is_healthy")),
        "steps":           [str(s) for s in (data.get("steps") or [])][:12],
        "timing":          data.get("timing") or "",
        "prevention":      data.get("prevention") or "",
        "region_snapshot": banner,
    }
    saved = sb.table("plant_scans").insert(row).execute().data
    return saved[0] if saved else row


@router.get("/history")
async def history(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("plant_scans").select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )
    return res.data or []


@router.delete("/{scan_id}")
async def delete_scan(scan_id: str, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("plant_scans").delete().eq("id", scan_id).eq("user_id", current_user["id"]).execute()
    return {"deleted": scan_id}
