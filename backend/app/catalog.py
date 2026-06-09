from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter()


@router.get("/regions")
async def get_regions():
    result = get_supabase().table("climate_zones").select("*").order("region").execute()
    return result.data


@router.get("/crops")
async def get_crops():
    result = get_supabase().table("crops").select("*").order("name_uk").execute()
    return result.data


class OnboardingRequest(BaseModel):
    region_id: str
    plot_type: str
    selected_crops: list[str] = []


@router.patch("/users/me/onboarding", status_code=status.HTTP_200_OK)
async def save_onboarding(
    body: OnboardingRequest,
    current_user: dict = Depends(get_current_user),
):
    allowed_plot_types = {"balcony", "dacha", "garden"}
    if body.plot_type not in allowed_plot_types:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid plot_type")

    user_id = current_user["id"]
    sb = get_supabase()

    result = sb.table("user_profiles").update({
        "region_id": body.region_id,
        "plot_type": body.plot_type,
        "selected_crops": body.selected_crops,
    }).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    return result.data[0]
