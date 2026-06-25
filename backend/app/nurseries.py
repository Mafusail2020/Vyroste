import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter(prefix="/nurseries")

PHOTO_BUCKET = "nursery-photos"
MAX_PHOTO_BYTES = 2 * 1024 * 1024  # 2 MB


def _require_admin(sb, user_id: str) -> None:
    profile = (
        sb.table("user_profiles").select("is_admin").eq("id", user_id).maybe_single().execute()
    )
    if not (profile.data or {}).get("is_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin only")


def _own_nursery(sb, nursery_id: str, user_id: str) -> dict:
    res = (
        sb.table("nurseries").select("*").eq("id", nursery_id).maybe_single().execute()
    )
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nursery not found")
    if res.data.get("owner_id") != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your nursery")
    return res.data


def _attach_review_stats(sb, nurseries: list[dict]) -> list[dict]:
    """Add review_count + avg_rating (approved reviews) to each nursery."""
    ids = [n["id"] for n in nurseries]
    sums: dict[str, list[int]] = {}
    if ids:
        revs = (
            sb.table("nursery_reviews")
            .select("nursery_id, rating")
            .in_("nursery_id", ids)
            .eq("status", "approved")
            .execute()
        )
        for r in (revs.data or []):
            sums.setdefault(r["nursery_id"], []).append(r["rating"])
    for n in nurseries:
        ratings = sums.get(n["id"], [])
        n["review_count"] = len(ratings)
        n["avg_rating"] = round(sum(ratings) / len(ratings), 1) if ratings else None
    return nurseries


@router.get("")
async def list_nurseries(
    region_id: str | None = Query(default=None),
    crop_id:   str | None = Query(default=None),
    tag:       str | None = Query(default=None),
):
    sb = get_supabase()
    q = sb.table("nurseries").select("*").eq("status", "verified")
    if region_id:
        q = q.eq("region_id", region_id)
    if crop_id:
        q = q.contains("crops_available", [crop_id])
    if tag:
        q = q.contains("tags", [tag])
    result = q.order("name").execute()
    return _attach_review_stats(sb, result.data or [])


@router.get("/{nursery_id}")
async def get_nursery(nursery_id: str):
    sb = get_supabase()
    result = (
        sb.table("nurseries")
        .select("*")
        .eq("id", nursery_id)
        .eq("status", "verified")
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nursery not found")
    return result.data


class NurseryCreate(BaseModel):
    name: str
    description: str | None = None
    address: str | None = None
    latitude: float
    longitude: float
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    region_id: str | None = None
    crops_available: list[str] = []
    # Owner-managed media + tags. admin_tags are intentionally NOT accepted here.
    photos: list[str] = []
    videos: list[str] = []
    tags: list[str] = []


class NurseryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    crops_available: list[str] | None = None
    photos: list[str] | None = None
    videos: list[str] | None = None
    tags: list[str] | None = None


class AdminTags(BaseModel):
    admin_tags: list[str] = []


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    _: dict = Depends(get_current_user),
):
    """Any authenticated user uploads a nursery photo → Supabase Storage."""
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")
    blob = await file.read()
    if len(blob) > MAX_PHOTO_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Image too large (max 2 MB)")

    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    path = f"{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_(PHOTO_BUCKET).upload(
            path, blob, {"content-type": file.content_type, "upsert": "false"}
        )
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload failed: {e}")
    return {"url": sb.storage.from_(PHOTO_BUCKET).get_public_url(path)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_nursery(
    body: NurseryCreate,
    current_user: dict = Depends(get_current_user),
):
    sb = get_supabase()
    result = sb.table("nurseries").insert({
        "name":             body.name,
        "description":      body.description,
        "address":          body.address,
        "latitude":         body.latitude,
        "longitude":        body.longitude,
        "phone":            body.phone,
        "email":            body.email,
        "website":          body.website,
        "region_id":        body.region_id,
        "crops_available":  body.crops_available,
        "photos":           body.photos,
        "videos":           body.videos,
        "tags":             body.tags,
        "owner_id":         current_user["id"],
        "status":           "pending",
    }).execute()
    return result.data[0]


@router.patch("/{nursery_id}")
async def update_nursery(
    nursery_id: str,
    body: NurseryUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Owner edits their own nursery (media, tags, contacts). Cannot touch
    admin_tags or status."""
    sb = get_supabase()
    _own_nursery(sb, nursery_id, current_user["id"])
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Nothing to update")
    res = sb.table("nurseries").update(patch).eq("id", nursery_id).execute()
    return res.data[0]


@router.patch("/{nursery_id}/admin-tags")
async def set_admin_tags(
    nursery_id: str,
    body: AdminTags,
    current_user: dict = Depends(get_current_user),
):
    """Moderator-only: set the admin badge tags on a nursery."""
    sb = get_supabase()
    _require_admin(sb, current_user["id"])
    res = sb.table("nurseries").update({"admin_tags": body.admin_tags}).eq("id", nursery_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nursery not found")
    return res.data[0]
