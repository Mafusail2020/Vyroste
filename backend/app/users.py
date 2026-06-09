from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter(prefix="/users")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class OnboardingRequest(BaseModel):
    region_id: str | None = None
    plot_type: str | None = None
    selected_crops: list[str] = []


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    sb = get_supabase()
    try:
        res = sb.auth.sign_up({"email": body.email, "password": body.password})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = res.user
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

    try:
        sb.table("user_profiles").insert({"id": user.id}).execute()
    except Exception:
        pass

    return {"id": user.id, "email": user.email}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    user_id = current_user["id"]

    result = sb.table("user_profiles").select("*").eq("id", user_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    return result.data
