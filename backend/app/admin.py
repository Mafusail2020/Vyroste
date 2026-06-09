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
