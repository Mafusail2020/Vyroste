from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter(prefix="/admin")


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    sb = get_supabase()
    result = (
        sb.table("user_profiles")
        .select("is_admin")
        .eq("id", current_user["id"])
        .maybe_single()
        .execute()
    )
    if not result.data or not result.data.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.get("/nurseries")
async def list_pending_nurseries(_: dict = Depends(require_admin)):
    result = (
        get_supabase()
        .table("nurseries")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .execute()
    )
    return result.data


class StatusUpdate(BaseModel):
    status: str


@router.patch("/nurseries/{nursery_id}/status")
async def update_nursery_status(
    nursery_id: str,
    body: StatusUpdate,
    _: dict = Depends(require_admin),
):
    if body.status not in {"verified", "rejected"}:
        raise HTTPException(status_code=422, detail="Status must be 'verified' or 'rejected'")
    result = (
        get_supabase()
        .table("nurseries")
        .update({"status": body.status})
        .eq("id", nursery_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Nursery not found")
    return result.data[0]


# ── Admin management (add / revoke admins by email) ─────────────────────────
def _email_to_id(sb) -> dict[str, str]:
    """email(lower) → user id, via the Supabase Auth admin API."""
    users = sb.auth.admin.list_users()
    return {(u.email or "").lower(): u.id for u in users}


def _id_to_email(sb) -> dict[str, str]:
    users = sb.auth.admin.list_users()
    return {u.id: (u.email or "") for u in users}


@router.get("/admins")
async def list_admins(_: dict = Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("user_profiles").select("id, display_name").eq("is_admin", True).execute().data or []
    try:
        emails = _id_to_email(sb)
    except Exception:
        emails = {}
    return [{"id": r["id"], "email": emails.get(r["id"], ""), "display_name": r.get("display_name")} for r in rows]


class AdminEmail(BaseModel):
    email: str


@router.post("/admins")
async def add_admin(body: AdminEmail, _: dict = Depends(require_admin)):
    sb = get_supabase()
    try:
        by_email = _email_to_id(sb)
    except Exception as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Auth API unavailable: {e}")
    uid = by_email.get(body.email.strip().lower())
    if not uid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Користувача з таким email не знайдено")
    sb.table("user_profiles").upsert({"id": uid, "is_admin": True}).execute()
    return {"id": uid, "email": body.email.strip(), "is_admin": True}


@router.delete("/admins/{user_id}")
async def revoke_admin(user_id: str, current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Не можна зняти права адміністратора з себе")
    sb = get_supabase()
    sb.table("user_profiles").update({"is_admin": False}).eq("id", user_id).execute()
    return {"id": user_id, "is_admin": False}
