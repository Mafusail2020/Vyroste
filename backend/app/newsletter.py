"""Weekly newsletter: admin-editable schedule + rich (block) content + send-now.

Content is a list of ordered blocks (heading / text / image / button) rendered
into an inline-styled HTML email. Settings live in a singleton `newsletter` row
(id = 1). The background scheduler (app/scheduler.py) sends weekly when enabled;
admins can also trigger an immediate send or a test send to themselves.

Sends run on a background thread (never block the request). Each recipient gets a
personal one-click unsubscribe link (HMAC-signed user id, no stored token);
opted-out users are filtered out of every send.
"""

import hashlib
import hmac
import threading
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.admin import require_admin
from app.deps import get_supabase
from app.email import send_html
from core.config import settings

router = APIRouter(prefix="/newsletter")

IMAGE_BUCKET = "article-images"      # shared public bucket
MAX_IMAGE_BYTES = 5 * 1024 * 1024    # 5 MB
_PAGE = 200                          # auth admin list_users page size


# ── Schemas ──────────────────────────────────────────────────────────────────

class Block(BaseModel):
    type: str                  # heading | text | image | button
    text: str | None = None
    url: str | None = None
    label: str | None = None
    alt: str | None = None


class NewsletterSettings(BaseModel):
    enabled: bool = False
    send_dow: int = 0          # 0 = Monday .. 6 = Sunday (matches datetime.weekday())
    send_hour: int = 9         # UTC hour, 0-23
    subject: str = "🌱 Щотижневі новини Виросте"
    audience: str = "all"      # all | premium
    blocks: list[Block] = []


# ── Helpers ──────────────────────────────────────────────────────────────────

def _load(sb) -> dict:
    """Singleton settings row; create it lazily on first read."""
    res = sb.table("newsletter").select("*").eq("id", 1).maybe_single().execute()
    if res and res.data:
        return res.data
    created = sb.table("newsletter").upsert({"id": 1}).execute()
    return created.data[0] if created.data else {
        "id": 1, "enabled": False, "send_dow": 0, "send_hour": 9,
        "subject": "", "audience": "all", "blocks": [], "last_sent_at": None,
    }


def _unsub_token(uid: str) -> str:
    return hmac.new(
        settings.supabase_jwt_secret.encode("utf-8"), uid.encode("utf-8"), hashlib.sha256
    ).hexdigest()


def _unsub_link(uid: str) -> str:
    return f"{settings.frontend_origin}/unsubscribe?u={uid}&t={_unsub_token(uid)}"


def render_html(subject: str, blocks: list[dict], unsub_link: str | None = None) -> str:
    """Render content blocks into an inline-styled HTML email body."""
    parts: list[str] = []
    for b in blocks:
        t = b.get("type")
        if t == "heading":
            parts.append(
                f'<h2 style="color:#2B6117;font-size:20px;margin:24px 0 8px;">{b.get("text", "")}</h2>'
            )
        elif t == "text":
            txt = (b.get("text") or "").replace("\n", "<br>")
            parts.append(
                f'<p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px;">{txt}</p>'
            )
        elif t == "image" and b.get("url"):
            parts.append(
                f'<img src="{b["url"]}" alt="{b.get("alt", "")}" '
                f'style="width:100%;border-radius:12px;margin:16px 0;display:block;">'
            )
        elif t == "button" and b.get("url"):
            parts.append(
                f'<div style="text-align:center;margin:28px 0;">'
                f'<a href="{b["url"]}" style="display:inline-block;padding:14px 32px;'
                f'background:#2B6117;color:white;text-decoration:none;border-radius:8px;'
                f'font-weight:900;font-size:15px;">{b.get("label") or "Відкрити"}</a></div>'
            )
    body = "\n".join(parts)
    unsub = (
        f'<br><a href="{unsub_link}" style="color:#9ca3af;text-decoration:underline;">Відписатися від розсилки</a>'
        if unsub_link else ""
    )
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;color:#1a1a1a;">
  <div style="background:#2B6117;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px;font-weight:900;">🌱 ВИРОСТЕ</h1>
  </div>
  <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
    {body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      Виросте — ваш персональний садовий помічник<br>
      <a href="{settings.frontend_origin}" style="color:#9ca3af;">{settings.frontend_origin}</a>{unsub}
    </p>
  </div>
</body></html>"""


def _recipients(sb, audience: str) -> list[tuple[str, str]]:
    """All target (user_id, email) pairs for an audience, paginated, minus opt-outs."""
    opt_out: set[str] = set()
    try:
        oo = sb.table("user_profiles").select("id").eq("newsletter_opt_out", True).execute()
        opt_out = {r["id"] for r in (oo.data or [])}
    except Exception:
        pass

    pairs: list[tuple[str, str]] = []
    page = 1
    while True:
        try:
            users = sb.auth.admin.list_users(page=page, per_page=_PAGE)
        except Exception:
            break
        if not users:
            break
        pairs.extend((u.id, u.email or "") for u in users)
        if len(users) < _PAGE:
            break
        page += 1

    if audience == "premium":
        prem = sb.table("user_profiles").select("id").eq("is_premium", True).execute()
        prem_ids = {p["id"] for p in (prem.data or [])}
        pairs = [(uid, e) for uid, e in pairs if uid in prem_ids]

    return [(uid, e) for uid, e in pairs if e and uid not in opt_out]


def _deliver(row: dict, recips: list[tuple[str, str]]) -> int:
    """Send the rendered newsletter to each recipient. Returns count sent."""
    subject = row.get("subject") or "Виросте"
    blocks = row.get("blocks") or []
    sent = 0
    for uid, email in recips:
        try:
            html = render_html(subject, blocks, _unsub_link(uid))
            send_html(email, subject, html)
            sent += 1
        except Exception:
            pass
    return sent


def send_to_audience(sb, row: dict) -> int:
    """Synchronous send to the row's audience (used by the scheduler)."""
    return _deliver(row, _recipients(sb, row.get("audience", "all")))


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", dependencies=[Depends(require_admin)])
def get_settings():
    return _load(get_supabase())


@router.put("", dependencies=[Depends(require_admin)])
def update_settings(body: NewsletterSettings):
    sb = get_supabase()
    patch = body.model_dump()
    patch["id"] = 1
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = sb.table("newsletter").upsert(patch).execute()
    return r.data[0]


@router.post("/send", dependencies=[Depends(require_admin)])
def send_now():
    """Queue an immediate send on a background thread; return the recipient count."""
    sb = get_supabase()
    row = _load(sb)
    recips = _recipients(sb, row.get("audience", "all"))

    def worker() -> None:
        _deliver(row, recips)
        try:
            sb.table("newsletter").update(
                {"last_sent_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", 1).execute()
        except Exception:
            pass

    threading.Thread(target=worker, daemon=True).start()
    return {"queued": True, "recipients": len(recips)}


@router.post("/test")
def send_test(current_user: dict = Depends(require_admin)):
    """Send the current draft only to the calling admin's own email."""
    sb = get_supabase()
    row = _load(sb)
    email = current_user.get("email")
    if not email:
        raise HTTPException(400, "No email on your account")
    html = render_html(row.get("subject", ""), row.get("blocks") or [], _unsub_link(current_user["id"]))
    try:
        send_html(email, f"[ТЕСТ] {row.get('subject') or 'Виросте'}", html)
    except Exception as e:
        raise HTTPException(500, f"Send failed: {e}")
    return {"sent_to": email}


@router.get("/unsubscribe")
def unsubscribe(u: str, t: str):
    """Public one-click unsubscribe — verifies the HMAC token, sets opt-out."""
    if not hmac.compare_digest(_unsub_token(u), t):
        raise HTTPException(400, "Invalid unsubscribe link")
    sb = get_supabase()
    sb.table("user_profiles").upsert({"id": u, "newsletter_opt_out": True}).execute()
    return {"ok": True}


@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Only image uploads are allowed")
    blob = await file.read()
    if len(blob) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image too large (max 5 MB)")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    path = f"newsletter/{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_(IMAGE_BUCKET).upload(
            path, blob, {"content-type": file.content_type, "upsert": "false"}
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    return {"url": sb.storage.from_(IMAGE_BUCKET).get_public_url(path)}
