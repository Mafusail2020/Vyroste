from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter(prefix="/nurseries")


@router.get("")
async def list_nurseries(
    region_id: str | None = Query(default=None),
    crop_id:   str | None = Query(default=None),
):
    sb = get_supabase()
    q = sb.table("nurseries").select("*").eq("status", "verified")
    if region_id:
        q = q.eq("region_id", region_id)
    if crop_id:
        q = q.contains("crops_available", [crop_id])
    result = q.order("name").execute()
    return result.data


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
        "owner_id":         current_user["id"],
        "status":           "pending",
    }).execute()
    return result.data[0]
